## One page, several builds, one React

The lesson **Module Federation, Monorepos and Design Systems** at the end of this module introduces hosts, remotes and `shared`. This lesson zooms into the part that breaks most often in production: how the runtime decides **which copy** of a shared dependency each build gets.

Every federated build (container) ships its own copy of its dependencies, as a fallback. At startup each container registers what it can provide into a **share scope**, a registry keyed by module name and version. When code inside a container imports a shared module, the runtime picks a version from the scope according to that container's rules.

```js
shared: {
  react: { singleton: true, requiredVersion: '^19.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
  'react-router': { singleton: true },
  '@acme/design-system': { singleton: true, requiredVersion: '^4.2.0', strictVersion: true },
  'date-fns': { requiredVersion: '^3.0.0' },
}
```

## The options

| Option | Meaning |
| --- | --- |
| `version` | The version this container **provides**. Defaults to the installed package's version. |
| `requiredVersion` | The semver range this container **accepts**. Defaults to the range in its `package.json`. |
| `singleton` | Only one version may exist on the page, whatever the ranges say. |
| `strictVersion` | Throw instead of warn when the chosen version is outside `requiredVersion`. |
| `eager` | Put the module in the initial chunk instead of behind an async request. |

## Non-singletons: highest compatible, else a duplicate

For an ordinary library, a consumer receives the **highest version in the scope that satisfies its range**. If nothing matches, it uses its own bundled copy. That is always correct, but it can load the library twice: a remote on `date-fns@4` next to a shell on `date-fns@3` downloads both. Duplicates cost bytes, not correctness, as long as the library keeps no module-level state that both copies must agree on.

## Singletons: one copy, ranges only report

Some libraries hold **global state that must be unique**:

- **React and react-dom.** A hook like `useState` reads the current dispatcher from internal state of the `react` module, which the renderer sets while rendering. If a remote's component imports a second `react` copy, its hooks see an empty dispatcher and React throws *Invalid hook call*.
- **Context providers.** `createContext()` returns an object compared by identity. A router or design system loaded twice creates two `ThemeContext` objects, so the remote's `useContext` never finds the shell's provider: no theme, no router, no error message pointing at the cause.

With `singleton: true` the runtime loads **one** version for everyone, by default the highest one provided. Ranges no longer decide; they only report. A consumer whose `requiredVersion` rejects the chosen version gets a console warning (*Unsatisfied version 19.1.0 from shell of shared singleton module react (required ^18.2.0)*) and runs anyway, on a React it was never tested against. With `strictVersion: true` the same mismatch throws when the module is loaded, so the remote fails fast instead of failing strangely.

That is the trade-off of singletons: correctness for hooks and context, paid for with **version coupling**. A React major upgrade has to be coordinated across every remote, or one team's deploy turns another team's page into warnings.

## Semver ranges in thirty seconds

`^19.1.0` accepts `19.x.x` from `19.1.0` up; `~7.4.2` accepts `7.4.x` from `7.4.2` up; `^0.2.1` is stricter because `0.x` versions treat the minor as breaking. An exact version accepts only itself and `>=` has no upper bound. Choosing ranges for shared modules is choosing how much drift the page tolerates.

## Eager and the async boundary

Shared modules are normally fetched asynchronously, after negotiation. If the entry file imports React synchronously, there was no time to negotiate and the runtime fails with *Shared module is not available for eager consumption*. The usual fix is an async boundary: `index.js` only does `import('./bootstrap')`. `eager: true` is the alternative: the module ships in the initial chunk, which the host may accept but remotes should avoid, since their copy is downloaded even when the host's wins.

## Module Federation 2.0

Federation is now a standalone project, `@module-federation/enhanced`, with plugins for webpack, built-in support in Rspack and a Vite plugin. It adds:

- an `mf-manifest.json` per remote, describing exposes, shared modules and versions;
- a runtime API usable without a bundler plugin: `createInstance`, `loadRemote('checkout/CheckoutPage')`, `registerRemotes` for remotes discovered at runtime;
- `shareStrategy`: `'version-first'` (default) loads remote entries at startup so the highest version wins, `'loaded-first'` reuses whatever is already loaded and fetches remotes on demand;
- runtime plugins to customize resolution, retries and fallbacks, and generated TypeScript types for remotes.

## When to choose it

Declare as **singletons** every library with module-level state the whole page must share: React, react-dom, the router, state containers and the design system's context. Add **`strictVersion`** where running on an untested version is worse than not running, such as a design system with breaking context changes. Leave stateless utilities **non-singleton** and accept occasional duplicates. If your remotes cannot agree on a React major for months, that is a signal to compose them behind a framework-agnostic `mount` contract or Web Components instead of sharing React at all.
