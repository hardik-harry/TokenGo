import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# Base Constants
OFFICES = [1, 2, 3] # 1: Rajkot, 2: Ahmedabad, 3: Surat
SERVICES = [1, 2, 3] # 1: LL, 2: DL Renewal, 3: New Veh Reg
START_DATE = datetime(2026, 1, 1)
DAYS_TO_SIMULATE = 30 # Simulate 1 month of traffic

# Base parameters per service
SERVICE_PARAMS = {
    1: {"avg_time": 10, "std_time": 3, "base_arrival_rate_per_hour": 15},
    2: {"avg_time": 12, "std_time": 4, "base_arrival_rate_per_hour": 12},
    3: {"avg_time": 20, "std_time": 5, "base_arrival_rate_per_hour": 8},
}

def get_multipliers(hour, weekday):
    """ Realistic multipliers based on time of day and day of week. """
    # Day multiplier: Mon-Fri busy, weekend off (we assume 0 for weekend, but let's say Sat is half day)
    if weekday == 6: # Sunday
        return 0, 0
    day_mult = 0.5 if weekday == 5 else 1.0 # Saturday is 50% traffic
    
    # Hour multiplier: Peak at 11 AM - 1 PM, dip at 1-2 PM (lunch), peak at 3 PM
    hour_mult = 0
    if 10 <= hour < 18:
        if 11 <= hour < 14:
            hour_mult = 1.4
        elif 14 <= hour < 15:
            hour_mult = 0.6  # Lunch
        else:
            hour_mult = 1.0
            
    return day_mult, hour_mult

def simulate_queue():
    print("Initializing realistic Queue Simulator...")
    all_records = []
    
    for office_id in OFFICES:
        # Scale Ahmedabad up by 1.5x, Rajkot 1.0x, Surat 1.2x
        office_scale = 1.5 if office_id == 2 else 1.2 if office_id == 3 else 1.0
        
        for service_id in SERVICES:
            params = SERVICE_PARAMS[service_id]
            base_rate = params["base_arrival_rate_per_hour"] * office_scale
            avg_service = params["avg_time"]
            std_service = params["std_time"]
            
            # Active counters (1 to 3 depending on office size)
            active_counters = 3 if office_id == 2 else 2 if office_id == 3 else 1
            
            for day_offset in range(DAYS_TO_SIMULATE):
                current_date = START_DATE + timedelta(days=day_offset)
                weekday = current_date.weekday()
                
                day_mult, _ = get_multipliers(12, weekday)
                if day_mult == 0:
                    continue # Skip closed days
                
                # Counters release time tracking to simulate actual queue blockages
                counters_busy_until = [current_date.replace(hour=10, minute=0, second=0)] * active_counters
                
                for hour in range(10, 18): # 10 AM to 6 PM
                    day_mult, hour_mult = get_multipliers(hour, weekday)
                    
                    # Arrivals happen per hour following Poisson
                    effective_rate = base_rate * day_mult * hour_mult
                    arrivals_this_hour = np.random.poisson(effective_rate)
                    
                    # Randomize arrival times within the hour
                    arrival_minutes = sorted(np.random.uniform(0, 60, arrivals_this_hour))
                    
                    for minute in arrival_minutes:
                        arrival_time = current_date.replace(hour=hour, minute=0, second=0, microsecond=0) + timedelta(minutes=minute)
                        
                        # Find the counter that will be free earliest
                        earliest_counter_idx = np.argmin(counters_busy_until)
                        earliest_free_time = counters_busy_until[earliest_counter_idx]
                        
                        # Queue length and people ahead at exact moment of arrival
                        # Anyone whose service hasn't started yet counts as in queue
                        in_queue_count = sum(1 for bt in counters_busy_until if bt > arrival_time)
                        # We approximate people ahead by looking at how backed up the earliest free counter is
                        people_ahead = max(0, in_queue_count - active_counters)
                        queue_length_at_arrival = people_ahead
                        
                        no_show_rate = 0.05
                        is_no_show = np.random.random() < no_show_rate
                        
                        if earliest_free_time < arrival_time:
                            service_start = arrival_time
                        else:
                            service_start = earliest_free_time
                            
                        # If no show, service ends immediately
                        if is_no_show:
                            actual_service_minutes = 0
                            service_end = service_start
                        else:
                            # Log-normal distribution to simulate realistic service times (never negative, long tails)
                            # Approximating parameters:
                            sigma = np.sqrt(np.log(1 + (std_service/avg_service)**2))
                            mu = np.log(avg_service) - 0.5 * sigma**2
                            actual_service_minutes = max(1.0, np.random.lognormal(mu, sigma))
                            service_end = service_start + timedelta(minutes=actual_service_minutes)
                        
                        counters_busy_until[earliest_counter_idx] = service_end
                        actual_wait_minutes = (service_start - arrival_time).total_seconds() / 60.0
                        
                        # Record tracking
                        record = {
                            "arrival_time": arrival_time.strftime("%Y-%m-%d %H:%M:%S"),
                            "day_of_week": weekday,
                            "hour": hour,
                            "office_id": office_id,
                            "service_id": service_id,
                            "queue_length_at_arrival": queue_length_at_arrival,
                            "people_ahead": people_ahead,
                            "active_counters": active_counters,
                            "historical_avg_service_time": avg_service,
                            "arrival_rate_15m": round(effective_rate / 4, 2),
                            "no_show_rate": no_show_rate,
                            "is_no_show": int(is_no_show),
                            "service_start": service_start.strftime("%Y-%m-%d %H:%M:%S"),
                            "service_end": service_end.strftime("%Y-%m-%d %H:%M:%S"),
                            "actual_wait_minutes": round(actual_wait_minutes, 2),
                            "actual_service_minutes": round(actual_service_minutes, 2)
                        }
                        all_records.append(record)

    df = pd.DataFrame(all_records)
    
    # Save the synthetic dataset
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "synthetic")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "historical_queue_dataset.csv")
    
    df.to_csv(out_path, index=False)
    print(f"Synthetic dataset realistically simulated and saved to {out_path}")
    print(f"Total Records Generated: {len(df)}")
    print(df.head())

if __name__ == "__main__":
    simulate_queue()
