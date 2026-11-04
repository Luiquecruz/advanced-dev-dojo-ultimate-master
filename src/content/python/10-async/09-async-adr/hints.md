Start with the numbers. Calls arrive at 1 200 × 2 per second and each spends 20 ms in flight on average: that product is `expected_in_flight`. The quota of 3 000 requests per second at 20 ms per call gives the largest concurrency that stays within it. Pick an integer between the two.
---
The queue drains at 1 200 events per second and no event may wait more than 0.5 s, so its size has an upper bound. For the CPU: 1 200 checks of 1 ms each is 1.2 CPU-seconds every second; divide by the 70% target and round up, then compare with the vCPUs the event loop leaves.
---
On a GIL build, pure-Python CPU work gains nothing from threads and blocks the loop if it stays there. Failures must reach the dead-letter topic, so they cannot be swallowed, and exception groups come from a task group. A p95 four times the mean is the reason for per-call timeouts.
