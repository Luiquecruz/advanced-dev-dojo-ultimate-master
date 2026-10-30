## From folders to rules

Feature folders and public APIs answer *where* code lives. **Dependency rules** answer *who may import whom*, and they are what keeps a large codebase from turning into a graph where everything depends on everything. **Feature-Sliced Design (FSD)** is the most complete published set of such rules for frontends.

## Layers

FSD splits `src/` into standardized layers, from most specific to most generic:

| Layer | Holds | Example |
| --- | --- | --- |
| `app` | bootstrap, providers, router, global styles | `app/App.jsx` |
| `pages` | one slice per route, composing widgets and features | `pages/checkout` |
| `widgets` | large self-contained UI blocks | `widgets/header` |
| `features` | user interactions that bring business value | `features/add-to-cart` |
| `entities` | business entities and their UI | `entities/product`, `entities/user` |
| `shared` | domain-free code: UI kit, API client, lib, config | `shared/ui/Button.jsx` |

(Older FSD versions also had `processes`, now deprecated.)

**Rule 1: import only downward.** A file may import layers strictly below its own. `features` may use `entities` and `shared`; `entities` may never import `features`. Higher layers know about lower ones, never the reverse, so a change in `pages` can never break `entities`.

## Slices and segments

The middle layers (`pages`, `widgets`, `features`, `entities`) are split into **slices** by business domain: `entities/product`, `entities/user`. Inside a slice, **segments** group code by purpose: `ui/`, `model/`, `api/`, `lib/`, `config/`.

`app` and `shared` have **no slices**: they are split into segments directly (`shared/ui`, `shared/api`).

**Rule 2: no sibling slices.** Slices of the same layer do not import each other. `features/cart` cannot import `features/catalog`, even through its public API. If both need something, it moves down (an entity or `shared`), or a higher layer (a widget or page) composes them.

**Rule 3: public API only.** Every slice exposes an `index` file; code outside the slice imports only that. Inside a slice, files import each other freely. `shared` is usually imported by path because it has no slices to protect.

```text
features/cart/ui/CartButton.jsx -> entities/product/index.js      ok
features/cart/ui/CartButton.jsx -> features/cart/model/store.js   ok, same slice
features/cart/ui/CartButton.jsx -> shared/ui/Button.jsx           ok, shared is not sliced
entities/product/model.js       -> features/cart/index.js         upward-import
features/cart/ui/CartButton.jsx -> features/catalog/index.js      sibling-slice
widgets/header/ui/Header.jsx    -> features/auth/ui/Login.jsx     deep-import
```

## Cross-entity relations

Real domains are connected: an order has products. FSD's answer is the `@x` notation (`entities/product/@x/order.js`), an explicit, narrow public API for one sibling. Use it sparingly; most of the time the composition belongs in a feature or widget above both entities.

## Enforcement

Rules nobody checks erode within weeks. Options, from lightest to heaviest:

- **ESLint `import/no-restricted-paths`**: zones such as "files in `src/entities` may not import from `src/features`". Simple, but sibling and public API rules need many zones.
- **`eslint-plugin-boundaries`**: declares element types (`layer`, `slice`) and allowed dependencies between them, including entry-point rules. Close to FSD out of the box.
- **Steiger**: the official FSD linter for structure and imports.
- **dependency-cruiser**: rules over the real module graph, with cycle detection and graph visualizations, runnable in CI on any bundler.
- **An architecture test**: a unit test that reads import statements and fails on violations. This platform does it in `src/architecture.test.ts`. That is what you build in the challenge: the graph extraction is mechanical, the interesting part is the rule engine.

## Pitfalls

- **Everything is a feature**: entities hold the nouns of your domain, features the verbs. Without entities, every feature needs a sibling.
- **A fat `shared`**: domain logic hidden in `shared/lib` bypasses every rule. Shared must stay domain-free.
- **Rules only in documentation**: if CI does not fail, the architecture is a suggestion.
- **Adopting all layers on day one**: a small app can start with `app`, `pages`, `shared` and add `entities`, `features` and `widgets` as they are needed. Skipping layers is allowed; reversing them is not.

## When to choose it

Adopt FSD (or a lighter subset) when several teams or many developers share one frontend and a stable, documented vocabulary helps onboarding. For a small app, feature folders with public APIs (Bulletproof React) are enough. Whatever structure you pick, encode its rules in a tool that runs in CI.
