## The tooling behind frontends at scale

The previous lessons built the contracts by hand. In production, a few tools and platform practices do the heavy lifting: **Module Federation** and **single-spa** for runtime composition, **monorepo tooling** for many apps in one repository, and a **design system** to keep everything consistent.

## Module Federation

Module Federation, introduced in Webpack 5 and now a standalone project (`@module-federation/enhanced`, built into Rspack, plugins for Vite), lets one deployed build load modules from another **at runtime**, as if they were local imports.

```js
new ModuleFederationPlugin({
  name: 'checkout',
  filename: 'remoteEntry.js',
  exposes: { './CheckoutPage': './src/CheckoutPage' },
  shared: { react: { singleton: true, requiredVersion: '^19.0.0' }, 'react-dom': { singleton: true } },
});
```

```js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: { checkout: 'checkout@https://cdn.example.com/checkout/remoteEntry.js' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});

const CheckoutPage = lazy(() => import('checkout/CheckoutPage'));
```

- **Remote**: a build that **exposes** modules. **Host**: a build that consumes **remotes**. One app can be both.
- **Shared**: dependencies negotiated at runtime so the page loads one copy. `singleton: true` is mandatory for React: two React instances break hooks and context. When versions are incompatible, the runtime warns and uses the loaded version, or fails with `strictVersion: true`. A shared singleton therefore re-couples upgrades: teams must agree on React's major version.
- Federation 2.0 adds a manifest, a runtime API to register remotes dynamically, and type sharing. It can also federate across server-rendered apps, with more complexity.

Federating React **components** couples teams more than federating whole pages behind a `mount` contract: a component's props become a cross-team API that changes without a compiler checking both sides.

## single-spa and iframes

**single-spa** is a framework-agnostic router for micro-frontends: a root config calls `registerApplication({ name, app, activeWhen })`, and each application exports `bootstrap`, `mount` and `unmount` lifecycles that return promises, the formal version of the shell from this module. It is usually combined with import maps (or Module Federation) to load the bundles.

**Iframes** give the strongest isolation (separate JavaScript realm, styles and crashes), at the price of awkward routing, sizing, focus management, accessibility and performance. They remain reasonable for third-party or legacy content.

## Monorepos with Nx and Turborepo

A monorepo keeps apps and internal packages in one repository, usually with package manager workspaces (pnpm, npm, Yarn):

```
apps/web  apps/admin  apps/docs
packages/design-system  packages/utils  packages/eslint-config  packages/tsconfig
```

The tooling makes it scale:

- **Task graph**: tasks depend on the same task of dependencies (`"dependsOn": ["^build"]` in `turbo.json`), so packages build before the apps that use them, in parallel where possible.
- **Caching**: a task's inputs (files, env vars, dependency outputs) are hashed; a hit restores outputs and logs instead of running again. **Remote caching** shares hits across developers and CI.
- **Affected**: `nx affected -t test` or `turbo run test --affected` only runs tasks for projects changed since the base branch and their dependents.
- **Boundaries**: Nx tags with `@nx/enforce-module-boundaries` forbid, for example, a `feature` library importing an `app`.

Turborepo is a focused task runner and cache; Nx adds generators, plugins, a project graph UI and boundary rules. A monorepo does not imply micro-frontends: many monorepos ship one app plus shared packages.

## The design system as a platform

When several products and teams build UIs, a design system becomes a **versioned product** consumed by others: tokens (color, spacing, typography), accessible components, guidelines and documentation. Examples: Shopify Polaris, the Atlassian Design System, IBM Carbon (available for React and Web Components). Treat it like a platform: semantic versioning, changelogs, deprecation periods, codemods for breaking changes, a dedicated owning team and a contribution model. In micro-frontend setups it is also what keeps several independently deployed apps looking like one product; share it as a federated singleton or accept per-app versions with visual drift.

## Composable commerce, briefly

**Composable (headless) commerce** splits a store into API-first services (catalog, cart, search, CMS, payments) consumed by a custom frontend, often React with Next.js or Shopify Hydrogen. The frontend usually needs a BFF to aggregate those services, and the architecture choices of this track apply unchanged.

## Cases

- **Zalando, Project Mosaic**: an early public micro-frontend architecture composing team-owned fragments on the server (the Tailor layout service and the Skipper router). Zalando later moved to a unified React rendering framework with shared renderers, after fragment-level autonomy produced inconsistency and duplicated effort: autonomy has to be rebalanced as the organization learns.
- **IKEA**: described composing pages from vertically owned, team-built fragments on the server and at the edge, keeping the browser light instead of composing in JavaScript.

## When to choose it

Pick **Module Federation** when you already run runtime micro-frontends and want shared dependencies and lazy remotes without building a loader; pick **single-spa** for mixing frameworks during a migration; use **iframes** only for untrusted or legacy content. Adopt **Nx or Turborepo** once several apps or packages share code and CI time grows. Invest in a **design system platform** when more than one product or team builds UI; it pays off in every architecture, from the modular monolith to micro-frontends.
