## Independent apps, one page

**Micro-frontends** are frontend applications built and deployed by different teams and composed into one product. The defining property is **independent deployment**: the checkout team ships at 3 p.m. without the profile team rebuilding anything. Where the composition happens is a design choice:

| Composition | How | Independent deploys? | Notes |
| --- | --- | --- | --- |
| Build time | Each app is an npm package installed by a host | No: the host must rebuild and redeploy | Simple, type-safe, really a monorepo with extra steps |
| Server side | The server stitches HTML fragments (SSI, ESI, Podium, Tailor) | Yes | Good first paint and SEO; interactivity needs per-fragment hydration |
| Edge | A CDN worker assembles fragments per request | Yes | Server-side composition closer to the user |
| Client side (runtime) | A shell loads each app's bundle in the browser and mounts it | Yes | Most flexible; costs JavaScript, needs contracts |

This lesson builds the client-side runtime variant, the model behind single-spa and most Module Federation setups.

## The lifecycle contract

The shell must not know which framework each team uses. It agrees on a tiny, framework-agnostic contract instead:

```js
export function mount(element, props) {
  const root = createRoot(element);
  root.render(<Profile {...props} />);
  return () => root.unmount();
}
```

`mount` renders into the element it receives and nothing else; the returned function removes everything it created: React roots, listeners, timers, subscriptions. A Vue team would call `createApp(...).mount(element)` and return `app.unmount`; a vanilla team appends nodes and removes them. single-spa formalizes the same idea as `bootstrap`, `mount` and `unmount` lifecycles.

## What the shell owns

- **Routing**: the shell maps top-level routes to micro-frontends (`/checkout/*` → checkout). Each micro-frontend handles its own sub-routes. Only the shell writes the top-level URL, so the back button keeps working.
- **Loading**: `load()` fetches a remote bundle (`import('https://cdn.example.com/checkout/v42/entry.js')`, a Module Federation remote, or a system loader). Cache the promise: a micro-frontend downloads once per session.
- **Lifecycle**: unmount the previous micro-frontend before mounting the next. Forgetting `unmount` leaks memory and keeps old event listeners alive.
- **Error isolation**: one team's broken release must not take down the page. Wrap `load` and `mount`, render a fallback for that slot, and report the error with the micro-frontend's name and version.
- **Shared dependencies**: two copies of React cost bandwidth, and two React instances cannot share context or hooks. Import maps or Module Federation `shared` singletons let apps reuse one copy; that couples their versions again, so upgrades need a policy.

## Communication

Micro-frontends should know as little about each other as possible. Prefer, in order:

1. **The URL**: the most robust contract. `/checkout?product=42` survives reloads and deep links.
2. **Browser events**: `window.dispatchEvent(new CustomEvent('mfe:navigate', { detail: { path: '/checkout' } }))`. Document every event name and payload as a versioned contract.
3. **Props from the shell**: data the shell already owns (current user, locale, `path`).

Avoid a shared global store across micro-frontends: it recreates the coupling you split to escape.

## Pitfalls

- **Stale navigations**: a slow `load()` resolving after the user moved on mounts the wrong app. Track the latest navigation and drop stale results.
- **Global side effects**: CSS leaking between apps, polyfills patched twice, `window` listeners never removed. Scope styles (CSS Modules, prefixes, Shadow DOM) and clean up in `unmount`.
- **Inconsistent UX**: several apps with diverging buttons and spacing. A shared design system package is part of the platform.
- **Performance**: every micro-frontend adds a bundle and a startup; measure the composed page, not each app alone.
- **Iframes as a shortcut**: strongest isolation, but poor accessibility, routing, sizing and performance; acceptable for embedding third-party or legacy apps.

## When to choose it

Choose runtime composition when several autonomous teams must deploy independently into the same page, or when migrating a legacy app route by route (strangler fig) next to a new React app. Start with the contract (`mount`/`unmount`, events, routes) and a shell owned by a platform team. If teams do not need independent deploys, the same contract inside a modular monolith gives the boundaries without the runtime cost.
