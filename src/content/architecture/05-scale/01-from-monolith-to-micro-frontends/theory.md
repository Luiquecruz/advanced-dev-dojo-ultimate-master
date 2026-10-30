## Scale is an organizational problem first

A single React app with a good folder structure serves one team for years. Trouble starts when **many teams** ship into the same codebase: merge queues grow, one broken test blocks everyone's release, nobody knows who owns `utils/`, and a change in checkout needs a review from the search team. None of this is a rendering or performance problem. It is a **coordination** problem, and the architectures in this module exist to reduce coordination between teams.

**Conway's law** states it plainly: a system's structure mirrors the communication structure of the organization that builds it. Four teams sharing one undivided app produce one tangled app. The *inverse Conway maneuver* turns this around: draw the boundaries you want in the code and organize teams along them.

## The spectrum of deploy coupling

Think of the options as a line. Every step to the right buys **team autonomy** and pays for it with **operational complexity**.

| Step | Repositories | Builds and deploys | Boundaries enforced by | Typical cost |
| --- | --- | --- | --- | --- |
| Monolith | 1 | 1 | Code review and goodwill | Grows into a big ball of mud |
| Modular monolith | 1 | 1 | Public APIs per module, lint or architecture tests, `CODEOWNERS` | Discipline, a dependency checker |
| Monorepo (many apps and packages) | 1 | Many, coordinated by a task graph | Package boundaries, Nx/Turborepo rules | Build tooling, versioning of internal packages |
| Micro-frontends | 1 or many | Many, independent | Runtime contracts (mount API, events, URLs) | Shared dependencies, routing, consistency, performance, observability |

- **Monolith**: one app, one build, one deploy. Simple to run, simple to refactor. The risk is not the single deploy, it is the absence of boundaries.
- **Modular monolith**: still one build and one deploy, but split into domain modules (`catalog`, `cart`, `account`) with explicit public APIs, no imports into another module's internals, and ownership per folder. It gives most of the code autonomy of micro-frontends at almost none of the runtime cost. It is the recommended default for multi-team products.
- **Monorepo**: one repository with several apps and versioned internal packages (design system, utilities, configs). Tools such as Nx and Turborepo build only what changed and cache the rest. A monorepo is about **code sharing and tooling**; it does not by itself give independent deploys.
- **Micro-frontends**: independently built and deployed applications composed into one product, at build time, on the server, at the edge or in the browser. Each team releases on its own cadence. In exchange you must solve shared dependencies (which React version?), cross-app routing, communication contracts, visual consistency, duplicated JavaScript and end-to-end observability.

## Signals that justify the next step

Move right only when a concrete pain appears, never in anticipation:

- **Number of teams**: one or two teams rarely need more than a modular monolith. Micro-frontends start paying off around several autonomous teams owning distinct domains.
- **Deploy cadence**: teams are blocked waiting for a shared release train, or a release of one domain must not risk another.
- **Coupling**: changes already stay inside one module most of the time. If a typical feature touches three modules, splitting the deploy makes every feature a multi-team, multi-release negotiation.
- **Independent lifecycles**: a domain needs a different framework version, a gradual rewrite (strangler fig), or comes from an acquisition.

## The distributed monolith

The worst result of moving right too early is a **distributed monolith**: separate deployables that still must be released together, share mutable global state, import each other's internals or call each other synchronously in chains. You pay every cost of distribution and get none of the independence. The usual root cause is splitting along technical layers (a "header app", a "forms app") instead of business domains, or splitting before the domain boundaries were understood.

## Pitfalls

- Choosing micro-frontends to fix a messy codebase. A missing module boundary becomes a missing service boundary, now with network calls.
- Treating a monorepo as an architecture. Without package boundaries it is a big monolith with a fancier build.
- Shared "common" packages that every team edits, recreating coupling through the back door.
- Ignoring the user: several apps loading their own copies of React and the design system hurt performance and consistency.

## When to choose it

Start with a **modular monolith**, enforce its boundaries with tests and `CODEOWNERS`, and keep it until a team is demonstrably slowed by others' releases. Add a **monorepo** when several deployables (web app, admin, docs, a design system package) genuinely share code. Choose **micro-frontends** only when several autonomous teams own decoupled domains and independent deploys are a real requirement; extract one module at a time from the modular monolith, starting with the one whose boundary is cleanest.
