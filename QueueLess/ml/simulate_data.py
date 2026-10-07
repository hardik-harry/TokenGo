import os
import json
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# QueueLess Synthetic Data Pipeline
# GENERATOR OF SIMULATED RTO ENVIRONMENTS
# Disclaimer: This generates purely synthetic simulation data. This is NOT real citizen waiting-time data.

def ensure_dirs(base_path):
    for d in ['raw', 'processed', 'synthetic']:
        os.makedirs(os.path.join(base_path, 'data', d), exist_ok=True)

def generate_simulation():
    # 1. Base Setup
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ensure_dirs(base_path=base_dir)
    
    # 2. Configuration Matrix (Fixed Seed for Reproducibility)
    seed = 42
    random.seed(seed)
    np.random.seed(seed)
    
    config = {
        "simulation_seed": seed,
        "days_simulated": 30,
        "operating_hours": {"start": 10, "end": 18}, # 10 AM to 6 PM
        "offices": [
            {"id": 1, "name": "Rajkot RTO", "traffic_multiplier": 1.2},
            {"id": 2, "name": "Ahmedabad RTO", "traffic_multiplier": 2.0},
            {"id": 3, "name": "Surat RTO", "traffic_multiplier": 1.5}
        ],
        "services": [
            {"id": 1, "code": "LL", "base_time_min": 25, "variance": 10},
            {"id": 2, "code": "DL_REN", "base_time_min": 15, "variance": 5},
            {"id": 3, "code": "VEH_REG", "base_time_min": 45, "variance": 15}
        ],
        "multipliers": {
            "peak_hour": {11: 1.5, 12: 1.8, 13: 1.2, 14: 1.1, 15: 1.4, 16: 1.6},
            "weekday": {0: 1.2, 1: 1.1, 2: 1.0, 3: 1.0, 4: 1.3, 5: 0.5, 6: 0.1} # Mon-Sun
        },
        "no_show_rate": 0.05,
        "counters_per_service": 2
    }
    
    with open(os.path.join(base_dir, 'data', 'synthetic', 'generation_config.json'), 'w') as f:
        json.dump(config, f, indent=4)
        
    start_date = datetime(2023, 1, 1, config["operating_hours"]["start"], 0)
    
    events = []
    snapshots = []
    
    token_counter = 1
    
    # 3. Queue Simulation Engine
    for day in range(config["days_simulated"]):
        current_date_start = start_date + timedelta(days=day)
        weekday_mult = config["multipliers"]["weekday"].get(current_date_start.weekday(), 1.0)
        
        # Skip Sundays heavily
        if weekday_mult < 0.2:
            continue
            
        for office in config["offices"]:
            for service in config["services"]:
                
                # Active counters for this service branch
                counters = [{"id": c, "free_at": current_date_start} for c in range(config["counters_per_service"])]
                
                daily_queue = []
                
                # Arrival Generation (Poisson Process approximation)
                current_time = current_date_start
                end_time = current_date_start.replace(hour=config["operating_hours"]["end"])
                
                while current_time < end_time:
                    hour = current_time.hour
                    peak_mult = config["multipliers"]["peak_hour"].get(hour, 1.0)
                    
                    # Base arrival rate (e.g. 4 people per hour)
                    base_rate_per_min = (4 / 60)
                    arrival_prob = base_rate_per_min * peak_mult * weekday_mult * office["traffic_multiplier"]
                    
                    if random.random() < arrival_prob:
                        token = {
                            "token_id": token_counter,
                            "office_id": office["id"],
                            "service_id": service["id"],
                            "arrival_time": current_time,
                            "no_show": random.random() < config["no_show_rate"]
                        }
                        daily_queue.append(token)
                        token_counter += 1
                        
                    current_time += timedelta(minutes=1)
                    
                # Process Queue Sequentially to derive causal Service Starts / Waits
                for idx, token in enumerate(daily_queue):
                    if token["no_show"]:
                        events.append({
                            "token_id": token["token_id"],
                            "office_id": token["office_id"],
                            "service_id": token["service_id"],
                            "arrival_time": token["arrival_time"],
                            "service_start_time": pd.NaT,
                            "service_end_time": pd.NaT,
                            "actual_wait_minutes": pd.NA,
                            "status": "NO_SHOW"
                        })
                        continue
                        
                    # Find first available counter
                    counters.sort(key=lambda x: x["free_at"])
                    best_counter = counters[0]
                    
                    # Target service starts when counter is free OR when user arrives (whichever is later)
                    service_start = max(token["arrival_time"], best_counter["free_at"])
                    
                    # Calculate true wait time matching prompt constraints strictly
                    wait_time = (service_start - token["arrival_time"]).total_seconds() / 60.0
                    
                    # Determine physical service duration
                    variance = (random.random() * 2 - 1) * service["variance"] # +/- variance
                    service_duration = max(5, service["base_time_min"] + variance)
                    
                    service_end = service_start + timedelta(minutes=service_duration)
                    
                    # Update counter utilization
                    best_counter["free_at"] = service_end
                    
                    events.append({
                        "token_id": token["token_id"],
                        "office_id": token["office_id"],
                        "service_id": token["service_id"],
                        "arrival_time": token["arrival_time"],
                        "service_start_time": service_start,
                        "service_end_time": service_end,
                        "actual_wait_minutes": wait_time,
                        "status": "COMPLETED"
                    })
                    
                    # Periodically snapshot queue environment for ML features
                    if idx % 5 == 0:
                         # People waiting physically arrived before this token's service started, but haven't started service yet
                         people_ahead = sum(1 for t in daily_queue[:idx] if t["arrival_time"] < service_start and not t["no_show"] and (t.get("service_start") is None or t["service_start"] >= service_start))
                         
                         snapshots.append({
                             "timestamp": service_start,
                             "office_id": token["office_id"],
                             "service_id": token["service_id"],
                             "people_ahead": people_ahead,
                             "active_counters": config["counters_per_service"],
                             "hour_of_day": service_start.hour,
                             "day_of_week": service_start.weekday()
                         })
                         
                    daily_queue[idx]["service_start"] = service_start # Track internally for snapshots

    # 4. Persistence
    df_events = pd.DataFrame(events)
    df_snapshots = pd.DataFrame(snapshots)
    
    out_events = os.path.join(base_dir, 'data', 'synthetic', 'queue_events_v1.parquet')
    out_snapshots = os.path.join(base_dir, 'data', 'synthetic', 'queue_snapshots_v1.parquet')
    
    df_events.to_parquet(out_events, index=False)
    df_snapshots.to_parquet(out_snapshots, index=False)
    
    print(f"Simulation completed deterministically (Seed: {seed}).")
    print(f"Generated {len(df_events)} events securely without injecting randomized unassociated columns.")
    print("Files saved to ml/data/synthetic/")

if __name__ == "__main__":
    generate_simulation()
