# Choosing a Framework

You built a server with `node:http` and a middleware `compose` by hand. Every Node.js framework packages those same pieces (routing, body parsing, middleware, error handling) with different priorities. The choice matters less for raw speed than for **conventions, ecosystem, runtime targets and how well a team (and an AI assistant) can stay consistent**.

## The landscape

| Framework | Model | Strengths | Weak spots |
| --- | --- | --- | --- |
| **Express** (5.x) | `(req, res, next)` on `node:http` | Everywhere: tutorials, middleware, hiring, AI training data. Express 5 finally catches rejected promises | Minimal structure, weak TypeScript inference, slower, Node only |
| **Fastify** | Plugins, JSON Schema per route | Very fast, schema-based validation and serialization, logging (pino) built in, mature plugin system | Node only, plugin encapsulation has a learning curve |
| **Hono** | Web Standards `Request` → `Response` | Runs on Node, Bun, Deno, Workers, Lambda; tiny; excellent TypeScript (typed routes and RPC client); good built-in middleware | Younger ecosystem; Node needs an adapter |
| **Koa** | `async (ctx, next)` onion | Elegant middleware model (Hono's ancestor) | Small ecosystem, little momentum |
| **NestJS** | Modules, controllers, providers, decorators, DI | Opinionated architecture for large teams, Angular-like, batteries included (OpenAPI, queues, GraphQL, microservices) | Heavy abstraction, decorators and DI magic, slower feedback loop, more code per feature |
| **Meta-framework route handlers** (Next.js, Nuxt, SvelteKit, Remix/React Router) | File-based `Request` → `Response` handlers next to the frontend | No separate service, shared types, one deploy | Coupled to the frontend's release cycle and hosting; awkward for long jobs, many clients or other teams |

## What actually differs

**Runtime portability.** Hono (and meta-framework handlers) speak the Fetch API, so the same app deploys to a container, a serverless function or an edge runtime. Express and Fastify are bound to `node:http`.

**Type safety.** Hono infers parameter, query and body types from routes and validators, and exports the route types for a client (the TypeScript module uses this). Fastify gets types from schemas with type providers. Express types are largely `any` unless you add wrappers.

**Validation and serialization.** Fastify and Hono make validation part of the route definition. In Express you pick and wire it yourself, so every codebase does it differently.

**Structure.** Express, Koa, Fastify and Hono leave architecture to you (the paradigms module covers layering). NestJS imposes it: great for consistency across 30 developers, overhead for a 10-endpoint service.

**Performance.** Fastify and Hono handle several times more trivial requests per second than Express in benchmarks. In real APIs the database dominates, so this matters only for very hot, simple endpoints.

## A decision guide

1. The API only serves your own Next.js/Nuxt frontend and does simple CRUD? **Route handlers or server actions** in the meta-framework; extract later if needed.
2. A new standalone TypeScript API, possibly serverless or edge? **Hono**.
3. A high-throughput Node service, with strong schema and logging needs? **Fastify**.
4. A large organization wanting enforced structure and Angular-like patterns? **NestJS**.
5. An existing Express codebase? **Stay on Express 5**, add validation and error handling conventions, migrate only with a concrete reason.

Whatever you pick, decide once per organization when possible: shared middleware, logging and error formats are worth more than any framework feature.

## Legacy vs modern

Older Express code uses `body-parser` (now built in as `express.json()`), callback-style middleware, `try/catch` + `next(err)` in every async handler and `app.listen` in the same file as the routes. Modern code separates the app from the server (so tests call the app directly), validates with schemas and centralizes errors, whatever the framework.

## When to choose it

Choose by constraints, in this order: where it must run (Node only vs edge/serverless), who maintains it (team size and existing skills), the ecosystem you need (auth, OpenAPI, queues), and only then performance. If two options fit, prefer the one with the clearest conventions: consistency is what keeps a growing codebase, and AI-generated additions to it, coherent.

## Working with AI

Assistants default to Express, often in its Express 4 style. State the framework and version explicitly ("Hono 4 on Node with `@hono/node-server`", "Fastify 5 with TypeBox") and paste one existing route as the pattern to follow. Review checklist:

- The generated code uses the framework you asked for, not a mix (no `res.send` in Hono, no `c.json` in Express).
- Versions match: no Express 4 `body-parser` or `next(err)` wrappers in Express 5, no Zod 3 syntax in Zod 4 code.
- The app is exported separately from `listen`/`serve`, so it is testable.
- Validation, error handling and logging follow the project's conventions instead of being reinvented per route.
- No unnecessary framework layered on top of another (NestJS on Fastify is fine; Express inside Next.js API routes is not).
