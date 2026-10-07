import os
import json
import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from features import load_and_preprocess_data

def evaluate_model():
    print("Evaluating actual model performance on unseen future data...")
    
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    model_path = os.path.join(models_dir, "rf_wait_model.joblib")
    
    if not os.path.exists(model_path):
        print("Model file absent. Executing train.py first...")
        from train import train_model
        X_test, y_test, pipeline = train_model()
    else:
        # Load from disk
        _, X_test, _, y_test, _, _ = load_and_preprocess_data()
        pipeline = joblib.load(model_path)
        
    model = pipeline['model']
    
    print("Generating predictions...")
    y_pred = model.predict(X_test)
    
    # Metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    metrics = {
        "MAE": round(mae, 2),
        "RMSE": round(rmse, 2),
        "R2_Score": round(r2, 4)
    }
    
    print("\n--- ACTUAL EVALUATION METRICS ---")
    print(f"Mean Absolute Error (MAE): {metrics['MAE']} minutes")
    print(f"Root Mean Squared Error (RMSE): {metrics['RMSE']} minutes")
    print(f"R-Squared (R²): {metrics['R2_Score']}")
    print("---------------------------------")
    
    metrics_path = os.path.join(models_dir, "model_metrics.json")
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=4)
        
    print(f"Metrics saved to {metrics_path}")

if __name__ == "__main__":
    evaluate_model()
