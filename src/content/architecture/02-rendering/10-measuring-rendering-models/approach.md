1. Do not trust the event order. Real traces interleave sources, so every metric is computed from times, never from positions in the array.
2. TTFB and FCP are "the first time this happened": take the minimum time of their event type, or `null` when the trace has none, so a broken measurement never looks like a 0 ms win.
3. LCP is "the last candidate that counts". Browsers stop reporting candidates after the first input, so compute the first input time before filtering the candidates, then take the latest one.
4. TBT is a window plus a threshold. The window starts at FCP (blocking a blank screen is not counted) and ends at `tti` or the end of the trace; inside it, only the part of each long task above 50 ms counts.
5. JavaScript bytes are a plain sum of `size` over `script` events.
6. Build the comparison rows by spreading each summary next to its model name, then sort by LCP with `null` last. A stable sort keeps the input order for ties.
7. For each metric, skip `null` values and keep the lowest, replacing the leader only on a strictly lower value so the first row wins ties.
8. Look at the sample result and argue with it: the SPA "wins" TTFB and has a lower TBT than SSR, yet shows content last. That is why the table, not one column, drives the decision.
