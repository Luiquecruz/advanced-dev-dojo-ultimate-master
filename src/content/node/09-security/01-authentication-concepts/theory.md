# Authentication Concepts

**Authentication** answers "who are you?"; **authorization** answers "what may you do?". This lesson is about the first, and about the architecture decisions you will make or review: sessions or tokens, where credentials live in the browser, and when to hand the whole problem to a provider.

## Sessions: state on the server

```text
POST /login (email, password) → server creates session { id: 'a1b2', userId: 42 } in Redis/DB
← Set-Cookie: sid=a1b2; HttpOnly; Secure; SameSite=Lax; Path=/
GET /me  Cookie: sid=a1b2      → server looks up the session → user 42
```

The cookie holds a random, meaningless id; the truth stays on the server. Logout, "log out everywhere" and banning a user are a delete. The cost is a lookup per request (cheap with Redis) and a shared session store when you run several instances.

## Tokens: state in the credential

A **JWT** carries the claims itself (`sub`, `role`, `exp`) with a signature, so any instance with the key can verify it without a lookup. That suits service-to-service calls and APIs consumed by many clients. The price: a token is valid until it expires, so revocation needs extra machinery (short lifetimes plus **refresh tokens**, or a deny list, which brings back the lookup). The next lessons build and verify one by hand.

| | Server sessions | Self-contained tokens (JWT) |
| --- | --- | --- |
| Revocation | immediate (delete the session) | waits for expiry, or needs a deny list |
| Per-request cost | one store lookup | signature check only |
| Size | small id | grows with the claims |
| Best for | browser apps on your own domain | APIs, mobile apps, service-to-service |

## Where the browser keeps the credential

| Storage | Readable by JavaScript | Sent automatically | Main risk |
| --- | --- | --- | --- |
| `HttpOnly` cookie | no | yes, to its domain | CSRF (mitigated by `SameSite`, CSRF tokens) |
| `localStorage` | yes | no (you add the header) | any XSS can steal the token |
| Memory (a variable) | yes | no | lost on reload, needs a refresh flow |

For browser apps the usual recommendation is an `HttpOnly; Secure; SameSite=Lax` (or `Strict`) cookie, which XSS cannot read. A bearer token in `localStorage` turns every XSS bug into account takeover. Cookie flags in one line: `HttpOnly` hides it from JavaScript, `Secure` sends it only over HTTPS, `SameSite` stops most cross-site requests from carrying it, and a `__Host-` prefix pins it to your exact host.

## OAuth 2.0 and OpenID Connect

**OAuth 2.0** is about delegated **authorization**: a user lets an app access their data at another service (read my GitHub repos) without sharing the password; the app receives an **access token**. **OpenID Connect (OIDC)** adds **authentication** on top: an **ID token** (a JWT) that says who the user is. "Sign in with Google" is OIDC.

The flow for web and mobile apps is the **Authorization Code flow with PKCE**:

1. The app redirects to the provider with `client_id`, `redirect_uri`, `scope`, `state` and a `code_challenge`.
2. The user logs in at the provider and consents.
3. The provider redirects back with a one-time `code`.
4. The backend exchanges the code (plus the `code_verifier`) for tokens, validates the ID token and creates its own session.

The implicit flow (tokens in the URL fragment) and the password grant are deprecated. Always validate `state` (CSRF on the login itself) and the ID token's `iss`, `aud`, `exp` and signature.

## Passwords, MFA and passkeys

If you store passwords, hash them with a slow, salted algorithm (next lesson), rate-limit login attempts, and offer MFA (TOTP apps, WebAuthn). **Passkeys** (WebAuthn with synced credentials) remove the shared secret entirely: the server stores a public key, phishing stops working. They are now supported by every major platform and most auth providers.

## Build or buy

Managed providers (Auth0, Clerk, WorkOS, Cognito, Firebase Auth, Supabase Auth) and libraries (Better Auth, Auth.js, Lucia-style guides) handle sign-up, email verification, password reset, MFA, social login, SSO and passkeys. Every one of those features is an attack surface you would otherwise build and maintain.

## When to choose it

- **Session cookies**: the default for a web app and its own backend on the same site. Simple, revocable, safe from XSS token theft.
- **JWT access tokens (short-lived) + refresh tokens**: APIs used by mobile apps, third parties or many services; keep access tokens to minutes.
- **OIDC with a provider**: social login, enterprise SSO (SAML/OIDC), or any team that does not want to own password security.
- **Passkeys**: offer them where the provider or library supports them; they are the strongest consumer option.

## Working with AI

Tell the assistant the client type (same-site web app, SPA on another domain, mobile app) and ask it to justify the storage choice. Review checklist:

- Credentials in the browser live in `HttpOnly; Secure; SameSite` cookies, not `localStorage`, unless there is a stated reason.
- Session ids and tokens are random (`crypto.randomBytes`/`randomUUID`), rotated on login and invalidated on logout.
- OAuth uses Authorization Code + PKCE, validates `state`, and verifies the ID token's signature, issuer, audience and expiry.
- Login, reset and verification endpoints are rate limited and return the same message for unknown users and wrong passwords.
- Generated code does not roll its own crypto when a vetted library or provider exists.
