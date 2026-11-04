1. Decide what makes an asset governable before storing it: a known kind, a named owner, and an expiry for every credential. Rejecting at registration is cheaper than finding the problem in an audit.
2. Treat the registry as the single source of truth: hand out copies so only its own methods change ownership or retire assets, which keeps the history explainable.
3. Write the audit as independent checks over each live asset (owner, expiry, activity), each producing its own finding, so one asset can surface several problems.
4. Inject `now` and express windows in days, so the same audit runs in tests, in a nightly job and in a backfill over old data.
5. Detect shadow AI from what you already have: the gateway log. Compare each key, model and agent against the registry and treat retired assets that still receive traffic as their own signal.
6. Aggregate signals by value with calls, tokens and sources, and sort by volume: the output should tell the governance team which conversation to have first.
