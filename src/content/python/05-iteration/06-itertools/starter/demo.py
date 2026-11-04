from collections import Counter

from main import batches, running_totals, runs, transitions

log = [
    {"status": "ok", "charge": 20},
    {"status": "ok", "charge": 35},
    {"status": "error", "charge": 0},
    {"status": "error", "charge": 0},
    {"status": "ok", "charge": 15},
    {"status": "timeout", "charge": 0},
    {"status": "ok", "charge": 40},
]

for number, chunk in enumerate(batches(log, 3), start=1):
    print(f"chunk {number}: {[event['status'] for event in chunk]}")

print("runs:", runs(log))
print("totals per status:", sorted(Counter(event["status"] for event in log).items()))
print("running charges:", running_totals(event["charge"] for event in log))
print("state changes:", transitions(event["status"] for event in log))
