Resolve each route first: `{ path: route.path, seo: route.seo ?? briefing.seo, ... }`. With every field resolved, the rendering rules become three `if`s in the order of the challenge: no SEO, then personalized, then the freshness lookup in `RENDERING_BY_FRESHNESS`.
---
Write the organization rule from the most demanding option down: check `teams > 1 && independentDeploys` first, then `teams > 1`, and fall back to `'feature-folders'`. Domain and BFF are one condition each; for the BFF count distinct clients with `new Set(briefing.clients).size`.
---
State depends on the renderings you already chose: start with `['local']`, push `'server-cache'` when `renderings.includes('spa')`, and push `'embedded-data'` when `renderings.some(...)` is one of `ssg`, `isr` or `ssr`.
---
`reason(subject, decision)` turns `{ choice, because }` into `` `${subject}: ${choice} because ${because}` ``. Join an array choice with `', '` first and use `String(choice)` for booleans. Keep each `because` concrete ("one team ships one deploy"), never generic ("best practice").
