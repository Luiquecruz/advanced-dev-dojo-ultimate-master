# Deployment Options

Deploying a Node API means answering three questions: **what artifact** do you ship (source, container image, function bundle), **who runs it** (you, a platform, a cloud function service), and **how does it scale** (fixed servers, autoscaling instances, per-request functions). There is no best option, only a fit for your traffic, team and budget.

## The options

| Option | Examples | You manage | Scaling | Best for |
| --- | --- | --- | --- | --- |
| **VPS / VM** | Hetzner, DigitalOcean Droplet, EC2 | OS, Node version, process manager, TLS, patches | Manual, vertical | Full control, low fixed cost, learning |
| **PaaS** | Render, Railway, Heroku, Fly.io | Your code and config | Instance count, sometimes autoscaling | Small teams shipping fast |
| **Managed containers** | Google Cloud Run, AWS ECS Fargate, Azure Container Apps | A Docker image | Autoscaling instances, often to zero | Standard production APIs, portability |
| **Kubernetes** | EKS, GKE, AKS | Cluster, manifests, networking | Very flexible | Many services and a platform team |
| **Serverless functions** | AWS Lambda, Google Cloud Functions, Vercel Functions | Function code | Per request, to zero | Spiky traffic, event handlers, cron jobs |
| **Edge runtimes** | Cloudflare Workers, Vercel Edge, Deno Deploy | Function code (Web APIs only) | Per request, globally | Low-latency logic close to users, auth, redirects, caching |

## Containers are the common denominator

A container image packages your code, `node_modules` and the Node version, so "works on my machine" becomes "works everywhere the image runs". A typical multi-stage `Dockerfile`:

```dockerfile
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

`npm ci` installs exactly the lockfile; the second stage ships no compilers or dev dependencies; `USER node` avoids running as root; `CMD` uses `node` directly (not `npm start`) so `SIGTERM` reaches your process for graceful shutdown.

## Serverless and edge: different constraints

Functions start on demand. That brings **cold starts** (hundreds of ms when a new instance boots), **time limits** (seconds to minutes per invocation), no long-lived in-memory state, and connection limits against traditional databases (use a pooler or an HTTP driver). Edge runtimes go further: they run Web-standard APIs (`fetch`, `Request`, `Response`, Web Crypto), not the full Node API, so `node:fs`, native modules and many npm packages do not work.

This is why **Hono** is popular: the same `app` runs on Node (`@hono/node-server`), Bun, Deno, Lambda and Cloudflare Workers, because it is built on the Fetch API:

```ts
export default app;
serve({ fetch: app.fetch, port: config.PORT });
```

## What every production deploy needs

- **Health checks**: `GET /health` (process alive) and a readiness check (dependencies reachable) so the platform routes traffic only to healthy instances.
- **Zero-downtime releases**: rolling or blue/green deploys plus graceful shutdown (`SIGTERM` → stop accepting, finish in-flight requests, close pools).
- **Migrations as a release step**, backward compatible with the previous version still running (expand, migrate, contract).
- **Rollback**: redeploy the previous image tag in one command.
- **CI/CD**: tests, type check and image build on every push; deploy from the main branch.
- **Observability**: structured logs to stdout, metrics, error tracking (Sentry), alerts.

## Pitfalls

- Choosing Kubernetes for one API and two developers: the cluster becomes the product.
- Long-running work (video encoding, big exports) inside a function with a 30 s limit; use a queue and a worker container.
- Edge deploys that import a Node-only library and fail only in production.
- Running `npm install` (not `npm ci`) in images, so builds drift from the lockfile.
- Secrets baked into the image layer history.
- No region strategy: a database in Virginia and functions in Frankfurt add latency to every query.

## When to choose it

Start on a **PaaS or managed container platform** (Render, Railway, Fly.io, Cloud Run): a Dockerfile or a repo link gives you HTTPS, logs, scaling and rollbacks with almost no ops. Choose **serverless functions** for spiky or low traffic, webhooks, scheduled jobs and glue code, especially inside an existing cloud. Choose **edge** for latency-sensitive, stateless logic that works with Web APIs (auth checks, redirects, personalization, API gateways) next to a regional database. Choose a **VPS** when cost control or full control matters more than convenience, and **Kubernetes** only with many services and people to run it.

## Working with AI

Brief the target first: "deploy to Cloud Run with a multi-stage Dockerfile, Node 24, non-root user, health endpoint, graceful shutdown, config from env". Assistants mix runtimes freely, so review:

- The code only uses APIs the target supports (no `node:fs` on edge; no in-memory sessions on serverless).
- The Dockerfile uses `npm ci`, multi-stage builds, a pinned Node major, a non-root user and `CMD ["node", ...]`.
- Health and readiness endpoints exist and graceful shutdown handles `SIGTERM`.
- Secrets come from the platform's secret store, never from the image or the repo.
- Migrations run as a separate step and stay compatible with the previous release.
