# OWASP API Security

The OWASP API Security Top 10 (2023 edition) lists the ways real APIs get breached. Very few of them involve clever cryptography; most are a missing check that nobody noticed in review. Reading AI-generated backend code with this list in mind catches most of the dangerous bugs.

## The Top 10 in one table

| # | Risk | What it looks like | Defense |
| --- | --- | --- | --- |
| API1 | Broken Object Level Authorization | `/orders/123` → `/orders/124` returns someone else's order | ownership or tenant check on every object (authorization lesson) |
| API2 | Broken Authentication | `decode` instead of `verify`, no login rate limit, tokens that never expire | vetted auth, verified tokens, short lifetimes, rate limits |
| API3 | Broken Object Property Level Authorization | response includes `passwordHash`; `PATCH` accepts `role` | explicit response schemas, whitelisted writable fields |
| API4 | Unrestricted Resource Consumption | no pagination cap, 50 MB bodies, unlimited AI or SMS calls | limits on size, page, rate and cost |
| API5 | Broken Function Level Authorization | `DELETE /admin/users/:id` only hidden in the UI | role checks on the server for every function |
| API6 | Unrestricted Access to Sensitive Business Flows | bots buying all tickets, mass sign-ups for a coupon | per-flow limits, device or human checks, business rules |
| API7 | Server Side Request Forgery | `POST /preview { url }` fetches `http://169.254.169.254/` | allowlist hosts and schemes, block private ranges, no redirects |
| API8 | Security Misconfiguration | permissive CORS, stack traces in errors, missing headers | secure defaults, generic error bodies, reviewed config |
| API9 | Improper Inventory Management | an old `/v1` without the new checks still running | inventory of routes and versions, retire old ones |
| API10 | Unsafe Consumption of APIs | trusting a partner API's response without validation | validate and time-limit every external response |

## Data exposure and mass assignment (API3)

```ts
app.get('/api/users/:id', async (c) => c.json(await db.user.findUnique({ where: { id } })));
app.patch('/api/users/me', async (c) => c.json(await db.user.update({ where: { id: me }, data: await c.req.json() })));
```

The first returns every column, including hashes and internal flags. The second lets a user send `{ "role": "admin" }`. Fix both with schemas: a Zod schema for the input that lists the writable fields, and a response mapper (or `select`) that lists the readable ones. Never rely on the frontend to hide fields.

## Resource consumption (API4)

Cap everything a client controls: `limit` (`Math.min(limit, 100)`), body size (`bodyLimit` middleware in Hono), upload size, query complexity in GraphQL, timeouts on outgoing calls, and spending (AI tokens, SMS, emails) per user per day.

## SSRF (API7)

Any feature that fetches a URL supplied by a user (link previews, webhooks, image import) can be pointed at your internal network or the cloud metadata service, which may hand out credentials. Allow only `https`, resolve the host and reject private and link-local ranges, disable redirects or re-check each hop, and prefer an allowlist of domains.

## Secrets

- Secrets live in environment variables or a secret manager, never in the repository, the frontend bundle or logs.
- `.env` files are in `.gitignore`; a leaked secret is **rotated**, not just deleted from Git history.
- Give each service its own credentials with the least privilege it needs (a read-only database user for reporting).
- Anything sent to the browser (`VITE_*`, `NEXT_PUBLIC_*`) is public.

## Security headers and CORS

`hono/secure-headers` (or `helmet` in Express) sets `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy` and a Content Security Policy where HTML is served.

CORS is a **browser** rule about which origins may read your responses; it is not authentication and does not stop curl or servers. Configure an explicit list of origins. `Access-Control-Allow-Origin: *` with credentials is refused by browsers, and reflecting any `Origin` back with `Allow-Credentials: true` lets any website make authenticated calls as your users.

## Errors and logging

Return generic messages and log the details server-side with a request id; stack traces and SQL errors in responses help attackers. Log security events (failed logins, 403s, rate limit hits) without logging passwords, tokens or full card numbers.

## Dependencies

Most code in your API is from npm. Commit the lockfile, run `npm audit` or a scanner in CI, update regularly, review new dependencies (maintainers, downloads, install scripts) and be wary of typosquatted names that assistants sometimes invent.

## When to choose it

Use the Top 10 as a review checklist for every new endpoint, not as a one-time audit. Prioritize by exposure: object-level authorization and authentication first (they leak data directly), then resource limits and SSRF on features that call out or cost money, then configuration. Automated tools (DAST scanners, dependency audits, secret scanners like gitleaks) catch configuration and known-vulnerability issues; authorization bugs need tests that act as another user.

## Working with AI

Ask the assistant to threat-model the endpoint against the OWASP API Top 10 and to write tests for the negative cases (another user's id, extra fields, huge limits). Review checklist:

- Every object access is scoped to the caller (API1); every admin function checks the role server-side (API5).
- Input and output go through explicit schemas: no raw `req.body` into the ORM, no full rows in responses (API3).
- Pagination, body size, timeouts and costly operations are capped (API4).
- User-supplied URLs are validated against an allowlist and private ranges (API7).
- CORS lists origins explicitly; security headers are on; errors are generic (API8).
- Secrets come from configuration, nothing sensitive is logged, and new dependencies are real, maintained packages.
