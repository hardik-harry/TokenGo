import os
import joblib
from sklearn.ensemble import RandomForestRegressor
from features import load_and_preprocess_data

def train_model():
    print("Initiating QueueLess Random Forest Training Sequence...")
    
    X_train, X_test, y_train, y_test, preprocessor, feature_names = load_and_preprocess_data()
    
    print(f"Training on {X_train.shape[0]} chronologically past records.")
    print(f"Validating against {X_test.shape[0]} untouched future records.")
    
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15, 
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    print("Fitting RandomForestRegressor...")
    model.fit(X_train, y_train)
    
    # Save the model and preprocessor pipelines
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # Standard format: Dictionary bridging pipeline steps
    pipeline = {
        'preprocessor': preprocessor,
        'model': model,
        'feature_names': feature_names
    }
    
    model_path = os.path.join(models_dir, "rf_wait_model.joblib")
    joblib.dump(pipeline, model_path)
    
    print(f"Model successfully trained and securely saved to {model_path}.")
    return X_test, y_test, pipeline

if __name__ == "__main__":
    train_model()
