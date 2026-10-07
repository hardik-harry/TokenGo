import pandas as pd
import numpy as np

def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans queue event logs by filtering extremes and processing missing fields securely.
    """
    print("Starting dataset cleaning sequence...")
    initial_len = len(df)
    
    # Drop hard duplicates
    df = df.drop_duplicates()
    
    # Drop rows where service time is negative or wait time is absurd (system glitch)
    df = df[df['actual_wait_minutes'] >= 0]
    df = df[df['actual_service_minutes'] >= 0]
    
    # Filter extreme outliers (e.g., someone waiting over 8 hours (480 mins) is an error/glitch)
    df = df[df['actual_wait_minutes'] <= 480]
    
    # Process No-shows (usually removed for base ML training unless we are predicting no-shows)
    df_served = df[df['is_no_show'] == 0].copy()
    
    final_len = len(df_served)
    print(f"Cleaned dataset from {initial_len} down to {final_len} valid service events.")
    
    return df_served

if __name__ == "__main__":
    import os
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "synthetic")
    df = pd.read_csv(os.path.join(data_dir, "historical_queue_dataset.csv"))
    clean_df = clean_dataset(df)
    clean_df.to_csv(os.path.join(data_dir, "cleaned_queue_dataset.csv"), index=False)
