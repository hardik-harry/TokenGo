import pandas as pd
import os

def analyze_wait_times():
    print("Running foundational analytics on cleaned queue metrics...")
    
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "synthetic")
    file_path = os.path.join(data_dir, "cleaned_queue_dataset.csv")
    
    if not os.path.exists(file_path):
        print("Required dataset not found. Execute run sequence: simulate -> clean")
        return
        
    df = pd.read_csv(file_path)
    print("\n--- Analytics Report ---")
    
    print("\n1. Overall Traffic Volume by Office")
    print(df.groupby('office_id').size().reset_index(name='Volume'))
    
    print("\n2. Average Wait Time by Service (Minutes)")
    summary = df.groupby('service_id')['actual_wait_minutes'].mean().round(2).reset_index()
    print(summary)
    
    print("\n3. Hourly Bottleneck Peak Matrix (Average Wait Time by Hour)")
    hourly = df.groupby('hour')['actual_wait_minutes'].mean().round(2).reset_index()
    print(hourly)
    
    print("\n--- Data correlation for Feature Importance ---")
    correlation = df[['people_ahead', 'active_counters', 'historical_avg_service_time', 'actual_wait_minutes']].corr()
    print(correlation['actual_wait_minutes'].sort_values(ascending=False))

if __name__ == "__main__":
    analyze_wait_times()
