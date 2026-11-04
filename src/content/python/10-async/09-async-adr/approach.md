1. Turn the briefing into rates: enrichment calls per second, CPU-seconds per second, events drained per second.
2. Apply Little's law to the enrichment calls and write down the average in-flight number. Then compute the concurrency the quota allows at mean latency, and check that the first number is below the second; if it were not, the briefing would need a different design.
3. Size the queue from the staleness budget and the drain rate, and decide what a full queue does to the broker reads.
4. Decide where the signature checks run on a GIL build, then size the pool from the CPU demand, the utilization target and the cores left by the event loop.
5. Choose the fan-out, the failure handling and the timeouts together: which combination reports every failure and keeps slow calls from holding slots?
6. Plan the shutdown within the 10 s budget, knowing how long a full queue takes to drain.
7. Write the ADR: the numbers in the context, a `We will` decision naming the mechanisms, rejected alternatives with the fact that ruled each out, and honest negative consequences. Re-read the coherence rules against every plan value.
