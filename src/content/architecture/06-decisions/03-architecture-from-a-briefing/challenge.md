Turn a product briefing into one decision per layer in `recommendArchitecture.js`. Export `recommendArchitecture(briefing)`. The rules below are the contract: always pick the **simplest option that satisfies the briefing**.

A briefing looks like this:

```js
{
  product: 'Public catalog',
  seo: true,
  personalized: false,
  dataChangesEvery: 'hour',        // 'never' | 'day' | 'hour' | 'request'
  teams: 1,
  independentDeploys: false,
  clients: ['web'],                // e.g. ['web', 'mobile']
  complexDomainRules: false,
  routes: [{ path: '/products/:id', seo, personalized, dataChangesEvery }],
}
```

**Route fields.** A route may omit `seo`, `personalized` or `dataChangesEvery`; a missing field falls back to the briefing field with the same name.

**Rendering per route** (first matching rule wins):

1. `seo` is false → `'spa'`.
2. `personalized` is true → `'ssr'`.
3. Otherwise by `dataChangesEvery`: `'never'` → `'static'`, `'day'` → `'ssg'`, `'hour'` → `'isr'`, `'request'` → `'ssr'`.

**Organization**: `teams > 1` **and** `independentDeploys` → `'micro-frontends'`; otherwise `teams > 1` → `'modular-monolith'`; otherwise `'feature-folders'` (one team never gets micro-frontends, even when it asks for independent deploys).

**Domain**: `complexDomainRules` → `'hexagonal'`, otherwise `'in-components'`.

**State**: an array in this order: `'local'` (always), then `'server-cache'` when at least one route is `'spa'`, then `'embedded-data'` when at least one route is `'ssg'`, `'isr'` or `'ssr'`. No global store.

**BFF**: `true` only when `clients` holds more than one **distinct** kind of client (`['web', 'mobile']`), otherwise `false`.

**Return value**:

```js
{
  rendering: { '/products/:id': 'isr', ... },   // one entry per route path
  organization, domain, state, bff,
  reasons: [...],
}
```

`reasons` holds one string per decision, in this order: one per route (in route order), then `organization`, `domain`, `state` and `bff`. Each one has the format `"<subject>: <choice> because <why>"`, where the subject is the route path or the layer name, an array choice is joined with `", "` (`state: local, embedded-data because ...`), a boolean is written as `true`/`false`, and `<why>` is at least ten characters tied to the briefing.
