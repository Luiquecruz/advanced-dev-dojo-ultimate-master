# JWT from Scratch

JSON Web Tokens are everywhere: OAuth access tokens, ID tokens, session tokens in SPAs, service-to-service calls. Libraries hide the format, which is exactly why mistakes slip through review. Building one by hand takes 40 lines and shows you what to check.

## Anatomy

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImV4cCI6MTcwMDAwMDA2MH0.4kG...
└──────────── header ────────────────┘ └──────────── payload ───────────────┘ └ signature
```

- **Header**: `{"alg":"HS256","typ":"JWT"}`, the algorithm used to sign.
- **Payload**: the claims, such as `{"sub":"42","role":"admin","iat":1700000000,"exp":1700000900}`. Times are **seconds** since the epoch, not milliseconds.
- **Signature**: `HMAC-SHA256(secret, base64url(header) + "." + base64url(payload))`, base64url encoded.

Each part is **base64url**: base64 with `-` and `_` instead of `+` and `/`, without `=` padding. Anyone can decode the payload (paste a token into jwt.io). A JWT is signed, not encrypted: never put secrets or personal data you would not show the user in it.

## Signing

```ts
import { createHmac } from 'node:crypto';

const encode = (value: string | Buffer) =>
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = encode(JSON.stringify({ sub: '42', iat: now, exp: now + 900 }));
const signature = encode(createHmac('sha256', secret).update(`${header}.${payload}`).digest());
const token = `${header}.${payload}.${signature}`;
```

Real Node.js supports `digest('base64url')` and `Buffer#toString('base64url')` directly; the conversion above works everywhere, including the browser runtime of this course.

## Verifying: the order matters

1. Split into exactly three parts.
2. Read the header and **pin the algorithm**: accept only the one you expect (`HS256`). Never let the token pick it.
3. Recompute the signature over the received `header.payload` and compare in constant time (`timingSafeEqual`).
4. Only now parse the payload and check `exp` (and `nbf`, `iss`, `aud` when you use them), with a little clock tolerance in distributed systems.

Two famous vulnerabilities come from skipping step 2:

- **`alg: none`**: early libraries accepted unsigned tokens when the header said `none`.
- **Algorithm confusion**: a server expecting RS256 receives an HS256 token signed with its **public** key used as the HMAC secret; a naive verifier that trusts `alg` accepts it.

And the most common bug in application code skips verification entirely: calling `jwt.decode(token)` (which only reads the payload) where `jwt.verify(token, key)` was needed.

## HS256 vs RS256/ES256

| | HS256 (HMAC) | RS256 / ES256 (signatures) |
| --- | --- | --- |
| Keys | one shared secret | private key signs, public key verifies |
| Who can verify | only holders of the secret, who can also sign | anyone with the public key (JWKS endpoint) |
| Fits | one service that issues and checks its own tokens | identity providers, many independent consumers |

An HS256 secret must be long and random (32+ bytes from `randomBytes`), loaded from the environment or a secret manager, and rotated with a key id (`kid`) in the header.

## Lifetimes and revocation

A signed token is valid until `exp`. Keep access tokens short (5 to 15 minutes) and pair them with a **refresh token** that is stored server-side, rotated on use and revocable. Long-lived JWTs without revocation are the reason "log out" often does not really log anyone out.

## When to choose it

Use JWTs when a token must be verified by services that do not share a session store: identity providers (OIDC ID tokens), microservices, third-party API access, edge functions. For a browser app talking to its own backend, an opaque session id in an `HttpOnly` cookie is simpler and revocable. When you do use JWTs, use a maintained library (`jose`, `hono/jwt`, `jsonwebtoken`) in production: the value of this lesson is knowing what that library must be configured to check.

## Working with AI

Ask for "verify with a pinned algorithm list, check `exp`, `iss` and `aud`, short-lived access tokens, secret from the environment". Review checklist:

- `verify`, not `decode`, guards every protected route; the decoded payload is never trusted before verification.
- The accepted algorithms are configured explicitly (`algorithms: ['HS256']` or the provider's list); `none` is impossible.
- Secrets are long, random and come from configuration; no hard-coded `'secret'`.
- Expiry is short and enforced; refresh tokens are revocable and rotated.
- No sensitive data in the payload; tokens are not logged.
