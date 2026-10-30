Build the core of a monorepo task runner, the part Turborepo and Nx run before any build starts.

Export `createWorkspace(packages)` from `workspace.js`. Each package looks like:

```js
{
  name: 'design-system',
  path: 'packages/design-system',
  dependencies: ['config'],
  files: { 'src/index.ts': 'export { Button } from "./Button";' },
}
```

The tests use this workspace: `web` (`apps/web`) depends on `design-system` and `utils`; `admin` (`apps/admin`) depends on `design-system`; `design-system` and `utils` depend on `config`; `config` has no dependencies.

`createWorkspace` returns three functions:

**`affectedBy(changedPaths)`**

- A package owns a path when the path equals its `path` or starts with its `path` followed by `/` (`packages/utils` owns `packages/utils/src/index.ts`, but not `packages/utils-legacy/index.ts`).
- Returns the names of the packages owning a changed path plus every package that depends on them, **transitively**, sorted alphabetically. Paths owned by no package (`README.md`) affect nothing.

**`buildOrder(targets)`**

- Covers the `targets` and all their dependencies, transitively, and nothing else.
- Returns an array of **levels**: level 0 holds packages without dependencies; every other package sits exactly one level above its deepest dependency. Packages in the same level can build in parallel. Each level is sorted alphabetically.
- When the graph has a cycle, throws `new Error('Dependency cycle: a -> b -> c -> a')`: the packages of the cycle in dependency order, starting and ending with the first package of the cycle reached from the targets.

**`async run(targets, { cache, build })`**

- `cache` is a `Map` the caller keeps between runs. `build(workspacePackage)` receives the package object and returns its output (a value or a promise).
- Processes the packages level by level, in `buildOrder(targets)` order.
- Computes a content hash for each package from its name, its files (paths and contents) and the hashes of its dependencies. Any deterministic hash works.
- Cache hit: does **not** call `build`, replays the cached output. Cache miss: calls `build` and stores the output under the hash.
- Returns `{ built, cached, outputs }`: the names built and the names restored from the cache, both in build order (level by level, alphabetical inside a level), and `outputs` mapping every package name to its output.

Changing one file must rebuild only its package and the packages that depend on it.
