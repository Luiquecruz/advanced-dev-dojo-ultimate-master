# Building Backends with AI

With an assistant, your job moves from typing code to **deciding, briefing and reviewing**. The assistant is fast and confident; it is also biased toward popular-but-dated patterns, invents APIs, and rarely asks about failure modes. Everything in this track exists to make you good at the three parts it cannot do for you.

## The loop

1. **Decide** the approach yourself (matrix below). Do not ask "how should I build this?" and accept the first answer; ask for options with trade-offs, then choose.
2. **Brief** with a contract: inputs, outputs, errors, rules, constraints.
3. **Generate small slices**: one endpoint or one module per request, following an existing file as the example.
4. **Verify by running**: type check, tests, a real request. Never review code you have not executed.
5. **Review** with the checklist, then iterate with precise feedback ("the 409 body must be `{ error: { code, message } }`").

## Briefing template

```md
Goal: <one sentence: the user-visible outcome>
Stack: Node 24, TypeScript strict, Hono 4, Zod 4, Postgres via <ORM>. Follow `src/tasks/` as the example.
Architecture: routes (parse, map errors) → service (rules, domain errors) → repository (data only).
Contract:
  POST /bookmarks  auth: Bearer  body: { url: URL, title: 1-100 chars, tags?: string[] }
  201 + Location → bookmark | 400 VALIDATION_FAILED | 401 UNAUTHORIZED | 409 CONFLICT (same url, same owner)
Rules: users only see and delete their own bookmarks; others' ids answer 404.
Non-functional: list endpoints paginate (max 100), all outbound calls time out at 5 s, no PII in logs.
Constraints: no new dependencies; config only via `config.ts`; inject clock and ids.
Deliverables: changed files only, plus Vitest tests through `app.request` for every status above.
Out of scope: UI, email notifications.
```

Constraints and out-of-scope lines prevent the two most common failures: unrequested dependencies and edits all over the codebase.

## Decision matrix

| Problem | Default choice | Switch when | Lesson |
| --- | --- | --- | --- |
| HTTP framework | Hono | Fastify for Node-only plugin ecosystems; NestJS for large teams wanting enforced structure | 05 |
| Input validation | Zod schemas at the edge | Shared schemas with the frontend via RPC types | 05, 11 |
| Errors | Domain errors + one `onError` | `Result` types where callers branch on many outcomes | 05, 06 |
| Code structure | Modular monolith, layered modules | Hexagonal for complex domains; services only for team or scaling needs | 06 |
| Database | Postgres | Key-value for caches and sessions, search engine for full-text, vector store for embeddings | 08 |
| Data access | Query builder or ORM with migrations | Raw parameterized SQL for hot or complex queries | 08 |
| Authentication | Managed provider or session cookies | Short-lived JWTs for service-to-service and stateless edges | 09 |
| Abuse protection | Rate limit per user/IP at the gateway or with Redis | Token bucket for bursty clients | 09 |
| Slow or retryable work | Queue + worker | In-process only when losing the job on restart is acceptable | 10 |
| Server push | SSE | WebSockets for bidirectional; managed services at scale | 05, 10 |
| CPU-heavy work | Separate worker or service | Worker threads for moderate, occasional jobs | 10 |
| Deployment | PaaS or managed containers | Serverless for spiky traffic and jobs; edge for latency-critical stateless logic | 12 |
| Tests | Integration through `app.request` + unit tests for rules | Testcontainers when you own SQL | 12 |

## Review checklist

- **Contract**: every status code and error body matches the brief; unknown routes 404; no stack traces in responses.
- **Validation**: all external input (body, params, query, headers, webhooks) parsed by a schema; limits on sizes and page lengths.
- **Security**: authorization checked per resource (not only "logged in"); parameterized queries; secrets from config; no sensitive fields in responses or logs.
- **Data**: multi-step writes in a transaction; uniqueness enforced by the database too; no N+1 queries; bounded result sets.
- **Reliability**: timeouts on every outbound call; retries only for idempotent operations; no unhandled promises; graceful shutdown untouched.
- **Maintainability**: follows the existing layers and naming; no new dependencies; no dead code or commented-out blocks.
- **Tests**: failing paths covered; literal expected values; tests fail when you break the code.

## Red flags

Hallucinated packages or methods (verify every import exists, and beware typosquatted names), outdated APIs (Express 4 callbacks, Zod 3 syntax, `request` library), `catch (e) {}` that swallows errors, `any` around external data, string-built SQL, `Math.random()` for tokens, and "fixed" tests that were changed to match buggy output.

## When to choose it

Delegate freely: boilerplate, CRUD that follows an example, schemas from a spec, test cases from a list of statuses, migration drafts you review. Pair closely: business rules, queries, performance work. Own the decision and review line by line: authentication, authorization, payments, data deletion, migrations on production data, and architecture choices. The more irreversible or security-sensitive the change, the less you delegate.

## Working with AI

Keep a project `CLAUDE.md` or rules file with your stack, layers, error format and conventions so every session starts briefed. Ask for options before code, one slice per request, tests alongside, and an explanation of trade-offs. Then run it, review it with the checklist above, and reject what you cannot explain.
