# npm and Package Management

You have used npm for every frontend project, mostly as `npm install` and `npm run dev`. On the server the stakes are higher: dependencies run with access to your secrets, database and file system, and a broken install can take production down. This lesson covers what to understand to choose, pin and review dependencies.

## package.json

```json
{
  "name": "orders-api",
  "type": "module",
  "engines": { "node": ">=24" },
  "packageManager": "pnpm@10.18.0",
  "scripts": {
    "dev": "node --watch --env-file=.env src/main.ts",
    "test": "vitest run",
    "start": "node src/main.ts"
  },
  "dependencies": { "hono": "^4.13.0", "zod": "^4.1.0" },
  "devDependencies": { "vitest": "^4.0.0", "typescript": "~6.0.2" }
}
```

| Field | Meaning |
| --- | --- |
| `dependencies` | Needed at runtime; installed in production |
| `devDependencies` | Needed to build, test or lint only; skipped by `npm ci --omit=dev` in production images |
| `peerDependencies` | A library says "I work with the host's copy of X" (a React component library and `react`) |
| `optionalDependencies` | Install may fail without breaking (platform-specific binaries) |
| `scripts` | Commands run with `npm run <name>`; `node_modules/.bin` is on the `PATH` |
| `engines`, `packageManager` | The Node version and package manager (with version) the project expects |

## Semantic versioning

Versions are `MAJOR.MINOR.PATCH`: breaking changes bump MAJOR, new features MINOR, fixes PATCH. Ranges decide what an install may pick:

| Range | Accepts | Typical use |
| --- | --- | --- |
| `^4.13.0` | `>=4.13.0 <5.0.0` | Default for npm installs |
| `~6.0.2` | `>=6.0.2 <6.1.0` | Tools that break in minors (TypeScript) |
| `4.13.0` | Exactly that version | Maximum control, manual updates |
| `0.x` | `^0.4.1` means `<0.5.0` | Pre-1.0: every minor may break |

Semver is a promise, not a guarantee. A patch can still break you, which is why lockfiles exist.

## Lockfiles

`package-lock.json` (npm), `pnpm-lock.yaml` or `yarn.lock` record the **exact** version and integrity hash of every package in the tree, including dependencies of dependencies. Commit it. Then:

- `npm install` may update the lockfile within the ranges; use it when changing dependencies.
- `npm ci` installs exactly what the lockfile says and fails if it disagrees with `package.json`. Use it in CI and Docker builds.

Without a committed lockfile, two builds of the same commit can ship different code.

## The tools

| Tool | Notes |
| --- | --- |
| **npm** | Ships with Node, works everywhere |
| **pnpm** | Content-addressed store with hard links: fast, disk-efficient, strict (a package can only import what it declares). Strong workspace (monorepo) support |
| **Yarn** | Workspaces, Plug'n'Play mode in modern versions |
| **Bun** | Very fast installer, usable even when running on Node |

`npx <tool>` (or `pnpm dlx`) runs a package's binary without adding it to the project, useful for scaffolding (`npx create-hono@latest`). Corepack and the `packageManager` field make every machine use the same manager and version.

## Supply-chain risks

Installing a package runs code from strangers, sometimes **at install time** through `preinstall`/`postinstall` scripts. Real attacks include typosquatting (`expresss`), hijacked maintainer accounts publishing malicious patch versions of popular packages, and worms that steal npm tokens to infect more packages. Defenses:

- Prefer fewer, well-maintained dependencies; check weekly downloads, maintainers, recent activity and whether a built-in already does the job.
- Commit the lockfile and install with `npm ci`; review lockfile diffs in pull requests.
- Disable or allow-list install scripts (`npm ci --ignore-scripts`; pnpm 10 blocks them unless approved).
- Delay brand-new versions (pnpm `minimumReleaseAge`, Renovate's minimum release age) so compromised releases are caught before you install them.
- Run `npm audit` or a scanner (Socket, Snyk, GitHub Dependabot) in CI, and update deliberately in small batches.
- Prefer packages published with provenance (`npm publish --provenance`), which links a release to its source repository and build.

## When to choose it

Use the project's existing manager. For new projects, npm is the zero-setup default; pnpm is the strongest choice for monorepos and strictness, and it is a good default for teams that care about install speed and safety. Pin tool versions that break in minors with `~`, keep `^` for libraries with good semver discipline, and use exact versions plus automated update PRs when you need full control. Before adding any dependency, ask whether Node already provides it and whether the package is worth its maintenance and risk.

## Working with AI

Assistants often suggest packages from older training data: deprecated (`request`), unnecessary (`node-fetch`, `uuid`, `dotenv`) or hallucinated names that an attacker may have registered. When reviewing generated changes, check:

- Every new package exists, is the intended one (exact name), is maintained and is needed.
- Runtime packages are in `dependencies`, build and test tools in `devDependencies`.
- The lockfile is updated in the same change, and CI uses `npm ci` (or `pnpm install --frozen-lockfile`).
- No `postinstall` scripts or `curl | sh` steps were added without a reason.
- Version ranges match the team's policy, and no major upgrade sneaked in.
