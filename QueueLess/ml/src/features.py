import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer

def load_and_preprocess_data():
    """
    Loads cleaned data, engineers features, prevents data leakage via chronological split,
    and scales/encodes appropriately.
    """
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "synthetic")
    df = pd.read_csv(os.path.join(data_dir, "cleaned_queue_dataset.csv"))
    
    # Sort chronologically to prevent future-data leakage in train/test split
    df['arrival_time'] = pd.to_datetime(df['arrival_time'])
    df = df.sort_values(by='arrival_time').reset_index(drop=True)
    
    # Feature Engineering
    # 1. Feature: queue_length (from queue_length_at_arrival)
    df['queue_length'] = df['queue_length_at_arrival']
    
    # 2. Feature: counter_load (ratio of people to active counters)
    # Ensure no division by zero safely
    df['counter_load'] = df['queue_length'] / df['active_counters'].replace(0, 1)
    
    # Target and Features
    target = 'actual_wait_minutes'
    features = [
        'people_ahead', 'queue_length', 'active_counters', 
        'historical_avg_service_time', 'arrival_rate_15m', 
        'hour', 'day_of_week', 'service_id', 'office_id', 
        'no_show_rate', 'counter_load'
    ]
    
    X = df[features]
    y = df[target]
    
    # Chronological Split (first 80% train, last 20% test)
    # test_size=0.2, shuffle=False guarantees time-series integrity
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    # Categorical Encoding
    # Services, Offices, and Days/Hours are nominal/categorical
    categorical_cols = ['hour', 'day_of_week', 'service_id', 'office_id']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
        ],
        remainder='passthrough'
    )
    
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    # Getting feature names out securely
    cat_features = preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_cols)
    continuous_features = [f for f in features if f not in categorical_cols]
    final_feature_names = list(cat_features) + continuous_features
    
    return X_train_processed, X_test_processed, y_train, y_test, preprocessor, final_feature_names
