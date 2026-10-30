## Two ways to cut a codebase

Every React project eventually answers one question: **what is the first level of folders?** There are two families of answers.

**By technical type** groups files by what they *are*:

```text
src/
  components/   ProductCard.jsx, CartBadge.jsx, LoginForm.jsx, Button.jsx ...
  hooks/        useProducts.js, useCart.js, useAuth.js ...
  services/     productsApi.js, cartApi.js, authApi.js ...
  utils/        formatPrice.js, validateEmail.js ...
```

**By feature (domain)** groups files by what they *do for the user*:

```text
src/
  app/          providers, router, bootstrap
  features/
    catalog/    api/, components/, hooks/, index.js
    cart/       api/, components/, hooks/, index.js
    auth/       ...
  shared/       ui/Button.jsx, lib/formatPrice.js, config/
```

The by-type layout is what tutorials and `create-*` templates start with, and it works well for a few dozen files. It breaks down as the app grows: a change to "the cart" touches `components/`, `hooks/`, `services/` and `utils/`; nothing tells you which files belong together; deleting a feature means hunting across every folder; and every file can import every other file, so coupling grows silently.

## Screaming architecture

Robert C. Martin called it **screaming architecture**: the top level of a codebase should scream *what the system is* ("a store with a catalog, a cart and checkout"), not *which framework it uses* ("components and hooks"). A by-feature layout gives:

- **Cohesion**: everything a feature needs sits in one folder, so most changes stay inside it.
- **Ownership**: a team can own `features/checkout` end to end.
- **Deletability**: removing a feature is removing a folder (plus its wiring in `app/`).
- **Boundaries you can enforce**: "features do not import each other's internals" is a rule a linter can check. "components do not import hooks" is not a meaningful rule.

Inside a feature, splitting by type again (`components/`, `hooks/`, `api/`) is fine: at that scale it is just tidiness.

## Bulletproof React

The Bulletproof React reference project turns this into explicit rules:

1. `src/features/<name>` holds everything for one domain area. Small apps may skip a folder until it is needed.
2. **No cross-feature imports**: features are composed at the app level (routes, layouts), not by importing each other.
3. **Unidirectional flow**: `shared → features → app`. Shared code never imports features; features never import the app.
4. Shared building blocks live in `components/`, `hooks/`, `lib/`, `utils/` at the root, and they must be domain-free.

These rules are enforced with ESLint (`import/no-restricted-paths`), which is the real difference between "we organize by feature" and an architecture that stays organized.

## MVC as code organization, and its legacy

Before components, frontend code was organized as **Model-View-Controller**: models hold data and rules, views render, controllers react to input and update models. React rejected the *file split* (a component colocates markup and behavior) but kept the *idea of separation*:

- **Container / presentational components** (2015): containers fetched and held state (controller + model access), presentational components only rendered props (view).
- **Custom hooks as controllers** (2019+): `useCart()` owns data and actions, the component renders. Same separation, no extra component layer.
- **Domain modules** (`domain/order.js`): the model as plain functions, independent of React.

So MVC did not disappear; it moved *inside* each feature.

## Colocation

Colocation says: **place code as close as possible to where it is used**. A helper used by one component lives next to it; a hook used by one feature lives in that feature; only code with several real consumers moves up. Tests, styles and stories sit next to the file they cover. Promote code outward only when a second consumer appears, never in advance.

## What belongs in `shared`

`shared` is for code with **no business knowledge**: UI primitives (`Button`, `Modal`), generic hooks (`useDebounce`), the API client, formatting helpers, config. Litmus test: *could this file be published as an npm package without mentioning your domain?* If `shared/formatPrice.js` starts checking whether the user has a premium plan, it belongs to a feature. A `shared` folder that grows a `utils/cartHelpers.js` is the by-type layout creeping back in.

## Pitfalls

- Creating `features/` but still importing `features/cart/hooks/useCart` from everywhere: a folder rename, not an architecture.
- Splitting by feature too early in a tiny app, with one file per folder.
- A "common" or "core" feature that every feature imports: that is `shared` with domain logic inside.
- Organizing by *page* instead of by *domain*: pages are compositions; two pages often share one feature.

## When to choose it

Use **by type** for small apps, prototypes and libraries where the whole codebase fits in one head. Move to **by feature** once several people work in parallel or a change regularly touches four top-level folders. Add enforced dependency rules (next lessons) when the team is large enough that conventions alone stop holding.
