1. Read the briefing as data: for each path note whether it is SEO-critical, whether the HTML is the same for every visitor and how often its data changes.
2. Eliminate models per route with the four rules: no SPA where SEO matters, no shared cached HTML for per-user pages, no build-time freeze for data that changes during the day, no per-request render for content that only changes on deploy.
3. Among what remains, pick the cheapest model that meets the freshness need: prebuilt pages for deploy-only content, background regeneration with on-demand revalidation for event pages, a client app for private screens.
4. Give every route a reason that names the deciding fact, so the map can be revisited later.
5. Write the context from the briefing forces (search share, freshness, spikes, budget) without arguing for the answer, then the decision as one "We will..." sentence that groups routes by model.
6. Record at least two real alternatives (one model everywhere, rebuilding on every change) with the fact that rules each out.
7. Split consequences into gains and costs, including what the stale window forces checkout to do, and set the status to accepted.
