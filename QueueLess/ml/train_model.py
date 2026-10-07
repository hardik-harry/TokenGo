import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer

def train_model():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    events_path = os.path.join(base_dir, 'data', 'synthetic', 'queue_events_v1.parquet')
    
    print("Loading events data...")
    df = pd.read_parquet(events_path)
    
    # 1. Feature Engineering (Strictly Historical/Causal)
    df = df.sort_values(by="arrival_time").reset_index(drop=True)
    
    # Filter only completed for training (must have wait time)
    df_valid = df[df['status'] == 'COMPLETED'].copy()
    
    print("Engineering features...")
    # Map external context (Static Service Baselines)
    service_baselines = {1: 25, 2: 15, 3: 45}  # LL=25, DL_REN=15, VEH=45
    df_valid['historical_avg_service_time'] = df_valid['service_id'].map(service_baselines)
    
    df_valid['hour'] = df_valid['arrival_time'].dt.hour
    df_valid['day_of_week'] = df_valid['arrival_time'].dt.dayofweek
    
    # Simulate active counters (we rigged it to 2 per office/service dynamically in simulation)
    df_valid['active_counters'] = 2
    
    # Historical rolling calculations per office & service
    # Arrival rate 15m (count arrivals in last 15 mins)
    df_valid = df_valid.sort_values(by=['office_id', 'service_id', 'arrival_time'])
    
    # Calculate rolling properly directly into numpy arrays to bypass index overlaps
    df_valid['arrival_rate_15m'] = (
        df_valid.groupby(['office_id', 'service_id'])
        .rolling('15min', on='arrival_time')['token_id']
        .count()
        .values
    )
    
    # For a robust ML model, we will calculate realistic queue_length and people_ahead approximations mapping actual flow
    df['is_arrival'] = 1
    df['is_completion'] = 0
    
    # Rebuild queue states
    time_series = []
    
    for (off_id, srv_id), group in df.groupby(['office_id', 'service_id']):
        group = group.sort_values(by="arrival_time")
        q_len = 0
        no_show_rolling = 0
        total_ops = 0
        
        for idx, row in group.iterrows():
            total_ops += 1
            if row['status'] == 'NO_SHOW':
                no_show_rolling += 1
                
            # Naive people ahead logic: For simulation simplicity, we assume queue length = people ahead
            # (Rough approx since people finish processing parallelly)
            time_series.append({
                'token_id': row['token_id'],
                'queue_length': max(0, q_len),
                'people_ahead': max(0, q_len),
                'no_show_rate': no_show_rolling / total_ops
            })
            
            if row['status'] == 'COMPLETED':
                q_len += 1 # At arrival, they add to queue
            
    ts_df = pd.DataFrame(time_series)
    df_valid = df_valid.reset_index().merge(ts_df, on='token_id', how='left')
    
    df_valid['counter_load'] = df_valid['queue_length'] / df_valid['active_counters'].replace(0, 1)
    
    # 2. Extract strictly required ML Columns
    features = [
        'people_ahead', 'queue_length', 'active_counters', 
        'historical_avg_service_time', 'arrival_rate_15m', 
        'hour', 'day_of_week', 'service_id', 'office_id', 
        'no_show_rate', 'counter_load'
    ]
    target = 'actual_wait_minutes'
    
    df_valid = df_valid.dropna(subset=features + [target])
    
    # 3. Chronological Train / Val / Test Split
    print("Splitting datasets chronologically...")
    dates = df_valid['arrival_time'].dt.date
    unique_dates = sorted(dates.unique())
    
    # 70% Train, 15% Val, 15% Test chronologically
    train_cutoff = unique_dates[int(len(unique_dates) * 0.70)]
    val_cutoff = unique_dates[int(len(unique_dates) * 0.85)]
    
    train_mask = df_valid['arrival_time'].dt.date <= train_cutoff
    val_mask = (df_valid['arrival_time'].dt.date > train_cutoff) & (df_valid['arrival_time'].dt.date <= val_cutoff)
    test_mask = df_valid['arrival_time'].dt.date > val_cutoff
    
    X_train, y_train = df_valid.loc[train_mask, features], df_valid.loc[train_mask, target]
    X_val, y_val = df_valid.loc[val_mask, features], df_valid.loc[val_mask, target]
    X_test, y_test = df_valid.loc[test_mask, features], df_valid.loc[test_mask, target]
    
    print(f"Data shapes -> Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
    
    # 4. Pipeline & Model Definition
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), features)
        ]
    )
    
    model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10, n_jobs=-1)
    
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', model)
    ])
    
    # 5. Training
    print("Training RandomForestRegressor...")
    pipeline.fit(X_train, y_train)
    
    # 6. Evaluation on Test Set
    preds_ml = pipeline.predict(X_test)
    
    # Deterministic Baseline Math Evaluator
    # fallback_wait = (people_ahead * avg_time) / active_counters
    preds_base = []
    for _, row in X_test.iterrows():
        base_calc = (row['people_ahead'] * row['historical_avg_service_time']) / max(1, row['active_counters'])
        preds_base.append(max(0, base_calc))
        
    def score_dict(y_true, y_pred, prefix):
        return {
            f"{prefix}_MAE": round(mean_absolute_error(y_true, y_pred), 2),
            f"{prefix}_RMSE": round(np.sqrt(mean_squared_error(y_true, y_pred)), 2),
            f"{prefix}_R2": round(r2_score(y_true, y_pred), 3)
        }
        
    metrics = {}
    metrics.update(score_dict(y_test, preds_ml, "ML"))
    metrics.update(score_dict(y_test, preds_base, "BASELINE"))
    
    print("\n--- Evaluation Metrics vs Baseline ---")
    print(json.dumps(metrics, indent=2))
    
    # 7. Persistence (joblib)
    os.makedirs(os.path.join(base_dir, 'models'), exist_ok=True)
    model_path = os.path.join(base_dir, 'models', 'rf_wait_model.joblib')
    # Save purely pipeline block as expected by inference endpoint
    joblib.dump({"preprocessor": pipeline.named_steps['preprocessor'], "model": pipeline.named_steps['model']}, model_path)
    
    metrics_path = os.path.join(base_dir, 'models', 'metrics_v1.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=4)
        
    print(f"\nModel saved successfully to {model_path}.")
    print(f"Metrics saved to {metrics_path}.")

if __name__ == "__main__":
    train_model()
