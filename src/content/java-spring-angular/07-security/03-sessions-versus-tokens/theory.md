# Sessions Versus Tokens

After a caller logs in, the server must recognize them on the next request without asking for the password again. There are two main designs: the server remembers the caller in a session, or the caller carries a signed token that proves who they are. Each design changes how you scale, how you log users out, where credentials live in the browser, and which attacks matter. This lesson compares them so you can choose deliberately.

You need: The Spring Security Filter Chain (authentication, `SecurityFilterChain`).

## Server-side sessions

On a successful login the server creates a session record in memory or in a shared store and sends the browser a cookie that holds only a random session id (`JSESSIONID` in a servlet container). The browser attaches the cookie to every request to that site, and the server looks the id up to find the caller. The secret data stays on the server.

Sessions give you control: you can end one immediately, list active sessions or change a user's roles in the record. The cost is state. With several application instances every instance needs access to the same sessions, through sticky routing or a shared store such as Spring Session. The session cookie is also sent automatically by the browser, which is exactly what CSRF attacks abuse (the next lesson).

Spring Security creates sessions as needed by default. The cookie can be hardened with Boot properties:

```yaml
server:
  servlet:
    session:
      timeout: 30m
      cookie:
        http-only: true
        secure: true
        same-site: lax
```

`HttpOnly` hides the cookie from JavaScript, `Secure` sends it only over HTTPS, and `SameSite` limits when the browser attaches it to cross-site requests.

## Stateless tokens

A token design keeps no session on the server. After login an authorization server issues an access token, typically a JWT that the next lesson explains. The client sends it in an `Authorization: Bearer <token>` header, and the server verifies the signature and expiry without any lookup. Any instance, or any other service that trusts the issuer, can validate it, which is why tokens suit APIs, mobile apps and several back ends sharing one login.

The trade-off is revocation. A signed token stays valid until it expires, so the server cannot simply forget it. You limit the damage by making access tokens short-lived (minutes), and you keep users signed in with a longer-lived refresh token that the client exchanges for a new access token. The issuer can retain grant or token state to support rotation and revocation without necessarily storing every refresh-token value. In Spring, a resource server that only reads bearer tokens declares that it never creates a session:

```java
http.sessionManagement(session -> session
    .sessionCreationPolicy(SessionCreationPolicy.STATELESS));
```

## Where a browser keeps a token

Any script running on your page can read `localStorage` and `sessionStorage`, so one cross-site scripting (XSS) bug lets an attacker steal the token. A token kept only in a JavaScript variable is harder to reach but disappears on reload, and a script that can run in your page can still use the app's own API calls. An `HttpOnly` cookie cannot be read by script, but it is attached automatically, so you are back to CSRF protection. RFC 10017, the best current practice for browser-based OAuth, ranks a backend for frontend first: a small server component keeps the tokens and gives the browser an `HttpOnly` session cookie, so the browser code never holds a token. It is strongly recommended for business and sensitive applications.

| Design | Server state | Revoke at once | Main browser risk |
| --- | --- | --- | --- |
| Session cookie | Yes | Yes | CSRF |
| Bearer token in script storage | No | Only by expiry or refresh revocation | XSS steals the token |
| Backend for frontend with session cookie | Yes, at the backend | Yes | CSRF, handled at the backend |

## Choosing

A server-rendered site or a single application with its own back end fits sessions. Several services, mobile clients or a third-party identity provider fit tokens. A single-page application with sensitive data is safest behind a backend for frontend. Whatever you choose, keep access tokens short, never put secrets in them, and fix XSS first, since it defeats every client-side storage option.

## Common mistakes

- Saving a long-lived token in `localStorage` because it is convenient. Any script on the page can read it, so a single XSS bug exposes the account.
- Treating a signed token as revocable. It stays valid until it expires, so keep it short-lived and revoke refresh tokens instead.
- Setting `SessionCreationPolicy.STATELESS` and then expecting the login to be remembered. Stateless means the client must send credentials or a token on every request.
- Sending a session cookie without `Secure` and `HttpOnly`, which exposes it on plain connections and to scripts.

## In practice

Many teams combine both: users sign in with a browser session at a gateway or backend for frontend, and that component calls internal APIs with short-lived tokens. The security question to ask of any design is the same: who can read the credential, who can replay it, and how fast can you cancel it.

## Check yourself

1. Why can a server end a session immediately but not a signed access token?
2. Which attack becomes relevant when you move a token into an `HttpOnly` cookie, and which when you keep it in `localStorage`?
3. What does a refresh token let you do that a long-lived access token does not?
