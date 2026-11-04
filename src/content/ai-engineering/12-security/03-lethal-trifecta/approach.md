1. Decide how to treat the unknown before anything else: a tool nobody labeled is assumed to have every capability. Failing closed here means a forgotten label creates a false alarm instead of a missed trifecta.
2. Analyze a session as a union: each tool, each untrusted trigger and each renderer contributes legs, and the report keeps the sources per leg so a reviewer can see *why* a leg is present.
3. Aggregate per agent, keeping session order, so the report reads like the configuration.
4. Suggest a removal with an explicit rule: the leg with the fewest sources is the cheapest to remove, and on ties external communication goes first because drafts or allowlists usually preserve most of the product.
5. Apply the removal as a pure function that returns a new configuration, then re-run the analysis to prove the session is safe. Never mutate the input: the same configuration may be analyzed again or diffed in review.
6. At runtime, track legs per session and check *before* recording: a denied call must not change the state, and the decision depends on the order of calls, not on the configuration alone.
