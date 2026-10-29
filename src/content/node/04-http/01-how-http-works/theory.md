# How HTTP Works

As a frontend developer you call APIs every day. Building them means owning the other half of the contract: what each method promises, which status code tells the client what to do next, and which headers control caching and cross-origin access. Frameworks hide the plumbing, not these decisions.

## A request and a response

```http
POST /orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOi...
Idempotency-Key: 6f1c2b

{"productId": 3, "quantity": 2}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /orders/981

{"id": 981, "status": "pending"}
```

Both have a start line, headers (case-insensitive names) and an optional body. HTTP/2 and HTTP/3 change the transport (binary frames, multiplexing, QUIC) but not these semantics, so everything below applies to all versions.

## Methods and their promises

| Method | Meaning | Safe | Idempotent | Body |
| --- | --- | --- | --- | --- |
| `GET` | read a resource | yes | yes | no |
| `HEAD` | `GET` without the body | yes | yes | no |
| `POST` | create, or run an action | no | **no** | yes |
| `PUT` | replace the resource at this URL | no | yes | yes |
| `PATCH` | partially update | no | not guaranteed | yes |
| `DELETE` | remove | no | yes | rarely |
| `OPTIONS` | ask what is allowed (CORS preflight) | yes | yes | no |

**Safe** means no side effects: crawlers, prefetchers and caches may call it freely, so a `GET /logout` or `GET /delete?id=3` is a bug. **Idempotent** means repeating the request has the same effect as sending it once. That is what lets clients, proxies and load balancers retry after a timeout: retrying `PUT /users/3` is harmless; retrying `POST /payments` may charge twice. APIs make `POST` safe to retry with an **`Idempotency-Key`** header: the server stores the result per key and replays it for duplicates.

## Status codes

| Range | Meaning | The ones you will use |
| --- | --- | --- |
| 2xx | success | `200 OK`, `201 Created` (+ `Location`), `204 No Content` |
| 3xx | go elsewhere | `301`/`308` permanent, `302`/`307` temporary, `304 Not Modified` |
| 4xx | the client must change something | `400` malformed, `401` not authenticated, `403` not allowed, `404`, `409 Conflict`, `413` too large, `415` wrong media type, `422` invalid data, `429` too many requests |
| 5xx | the server failed; retrying may help | `500`, `502 Bad Gateway`, `503 Unavailable` (+ `Retry-After`), `504 Gateway Timeout` |

The code drives client behavior: retry logic, caching, redirects and monitoring all read it. Returning `200 { "error": "..." }` breaks every one of them. `401` vs `403`: "who are you?" vs "I know you, and no".

## Headers that matter

| Header | Direction | Purpose |
| --- | --- | --- |
| `Content-Type` | both | format of the body (`application/json`) |
| `Accept` | request | formats the client understands |
| `Authorization` | request | credentials (`Bearer <token>`, `Basic ...`) |
| `Cookie` / `Set-Cookie` | request / response | session state; `HttpOnly`, `Secure`, `SameSite` |
| `Cache-Control` | response | who may cache and for how long |
| `ETag` / `If-None-Match` | response / request | revalidation: `304` if unchanged |
| `Location` | response | the created resource or redirect target |
| `Retry-After` | response | when to retry a `429` or `503` |

## Caching

`Cache-Control` decides who may store a response: `public, max-age=31536000, immutable` for hashed static assets; `private, max-age=60` for per-user data cached only by the browser; `no-store` for sensitive data. With an `ETag`, the client sends `If-None-Match` and the server answers `304 Not Modified` with no body when nothing changed, saving bandwidth but not the round trip. Authenticated API responses should never be `public`: a shared CDN could serve one user's data to another.

## CORS

Browsers block a page on `app.example.com` from reading responses from `api.example.com` unless the API opts in. For "non-simple" requests (JSON bodies, `Authorization`, `PUT`/`DELETE`) the browser first sends a **preflight** `OPTIONS` request; the server answers with `Access-Control-Allow-Origin`, `-Methods`, `-Headers` (and `-Credentials` for cookies). Key facts: CORS is enforced by **browsers only** (curl and servers ignore it), so it is not authentication; `*` cannot be combined with credentials; reflecting any `Origin` back is equivalent to no protection. A same-origin setup (a reverse proxy serving app and API under one domain) avoids CORS entirely.

## When to choose it

These are the defaults to apply: `GET` for reads, `POST` for creation and actions with an idempotency key when retries matter, `PUT` for full replacement, `PATCH` for partial updates, `DELETE` for removal. Choose the most specific status code the client can act on. Cache static assets aggressively, private data only in the browser, and sensitive data not at all. For CORS, list the exact origins you serve; prefer same-origin deployment when you control both sides.

## Working with AI

Give the assistant the contract, not just the feature: method, path, status codes for success and each failure, headers (caching, `Location`, `Retry-After`) and the CORS origins. Review generated APIs for: side effects behind `GET`; `200` with an error body; `500` for client mistakes (validation should be `400`/`422`); missing `Location` on `201`; non-idempotent retries on `POST`; `Access-Control-Allow-Origin: *` with credentials or a reflected origin; `Cache-Control: public` on per-user responses.
