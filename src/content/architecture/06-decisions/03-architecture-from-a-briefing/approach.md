1. Read the briefing as data: every field is a force from the context (SEO, personalization, freshness, teams, deploys, clients, rules). Each layer reads only the forces that matter to it.
2. Normalize the routes before deciding anything. Fallbacks from the briefing keep route lists short and make every route answer the same three questions.
3. Order every rule from the most specific requirement to the default. The default is the simplest option (SPA, feature folders, components, local state, no BFF); a stronger option appears only when a field demands it.
4. Make each chooser return the choice and the reason together, so a decision can never exist without its justification.
5. Derive state from the rendering decisions instead of from the briefing: the homes follow where data is fetched (client cache for SPA routes, embedded data for server-rendered ones).
6. Format the reasons last and run the briefings in the tests: an internal dashboard, a public catalog, a marketing site, a multi-team marketplace and a web plus mobile product should each produce a different, explainable answer.
