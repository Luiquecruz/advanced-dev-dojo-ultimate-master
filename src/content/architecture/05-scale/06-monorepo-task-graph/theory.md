## What a monorepo tool actually does

The lesson **Module Federation, Monorepos and Design Systems** at the end of this module places Nx and Turborepo in the big picture. This lesson opens the box. Strip away the CLI and both tools do four things: build a **graph of packages**, expand it into a **graph of tasks**, decide **what changed**, and skip work whose **inputs were already seen**. All four are small algorithms you can write in an afternoon.

## Workspaces and the package graph

A workspace is a repository with several `package.json` files that the package manager links together (pnpm, npm or Yarn workspaces):

```
apps/web             depends on design-system, utils
apps/admin           depends on design-system
packages/design-system   depends on config
packages/utils           depends on config
packages/config
```

```json
{ "name": "web", "dependencies": { "design-system": "workspace:*", "utils": "workspace:*" } }
```

The tool reads every manifest and turns internal dependencies into edges. That **package graph** must be acyclic: if `utils` imports `design-system` and `design-system` imports `utils`, nothing can build first. Tools refuse a cycle and print its path, because the fix is architectural (extract the shared part into a third package), not a flag.

## From packages to tasks

A task is a package plus a script: `web#build`, `utils#test`. The pipeline says how tasks relate:

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"] },
    "lint": {}
  }
}
```

In `turbo.json` (Nx writes the same in `targetDefaults`), `^build` means "the `build` of every dependency first", `build` without the caret means "my own `build` first", and a task without `dependsOn` can start immediately. Expanding the pipeline over the package graph gives the **task graph**.

## Topological order and parallel levels

A valid order puts every task after its dependencies: a **topological sort**. Runners go further and group tasks into **levels**: a package with no dependencies is level 0, and any other package sits one level above its deepest dependency. Every task in a level can run in parallel, so the wall-clock time is the length of the longest chain, not the number of packages:

```
level 0: config
level 1: design-system, utils
level 2: admin, web
```

Real schedulers start a task the moment its own dependencies finish instead of waiting for the whole level, but levels are the right mental model and what the graph views draw.

## Affected: work only where change can matter

CI runs on a diff. Each changed file belongs to the package whose folder contains it. Anything that **depends** on a changed package, transitively, may behave differently too, so the affected set is the changed packages plus all their dependents: walk the graph **backwards**.

```bash
npx nx affected -t test --base=origin/main
npx turbo run test --affected
```

A change in `packages/design-system` affects `admin` and `web` but not `utils`. Files outside every package (the root lockfile, a shared `tsconfig.base.json`) are **global inputs**: tools treat them as affecting everything, which is why bumping a root dependency triggers a full run.

## Content-hash caching

Affected detection answers "could this change?". The cache answers "did this exact input run before?". Before running a task, the tool hashes its inputs:

- the package's source files (or the subset declared in `inputs`),
- the **hashes of its dependencies**' tasks,
- the task configuration, declared environment variables and global inputs.

The hash is the cache key. On a hit the tool skips the task, restores its `outputs` (`dist/**`) and replays the logs; on a miss it runs the task and stores the result. Including dependency hashes makes invalidation propagate: change `utils` and `web` gets a new hash, while `admin` hashes exactly as yesterday. A **remote cache** (Vercel Remote Cache, Nx Cloud, or self-hosted) shares those keys across developers and CI, so a branch rebuilt by a teammate is free for you.

## Pitfalls

- **Undeclared inputs.** A build that reads `process.env.API_URL` without declaring it in `env` produces the same hash for different outputs: a stale cache hit ships the wrong value.
- **Missing outputs.** If `outputs` omits a folder, a cache hit restores logs but not the files the next task needs.
- **Non-deterministic builds.** Timestamps or random ids in outputs make caching useless downstream.
- **Phantom dependencies.** Importing a package you did not list in `package.json` hides an edge from the graph; the order and the affected set are then wrong. Lint for it (Nx module boundaries, ESLint `import/no-extraneous-dependencies`).

## When to choose it

Reach for a task runner once a repository holds several apps or packages and CI time grows with the repo instead of with the change. Pick **Turborepo** when you want a small, config-light runner with remote caching on top of your package manager; pick **Nx** when you also want generators, plugins, a project graph UI and enforced module boundaries. A single app with a couple of folders does not need either: the graph has one node, and the cache saves nothing your bundler does not already skip.
