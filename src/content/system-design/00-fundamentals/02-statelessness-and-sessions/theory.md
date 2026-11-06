# Statelessness & Sessions

HTTP forgets: every request arrives on its own, and nothing in the protocol says that two requests came from the same person. Yet users log in once and stay logged in. This lesson shows where that memory can live, why keeping it inside one server breaks as soon as you run a second copy, and the two common answers: a shared session store and signed tokens.

You need: Client-Server Architecture & HTTP Basics.

## Stateless servers

A server is **stateless** when it keeps nothing between requests that the next request depends on. Everything it needs comes from the request itself (headers, path, body) or from a shared system every copy can reach, such as a database.

Statelessness is what makes a service easy to grow. When one copy of the server is not enough, you start a second and a third, and requests from the same user may land on any of them. If every copy can answer every request, you can add copies, remove them or restart them without anyone noticing. A server that remembers things in its own memory loses that freedom: a restart or a deploy wipes the memory, and a request that reaches another copy finds nothing.

## Sessions

A **session** is the server-side record that says "this browser belongs to user Ada, until a certain time". The usual flow:

1. The user sends a name and password to `POST /login`.
2. The server checks them, creates a random, unguessable **session id** and stores `id → { user: 'ada', expiresAt }`.
3. The response sets a cookie, `Set-Cookie: sid=<id>; HttpOnly; Secure` (`HttpOnly` hides it from page scripts, `Secure` sends it only over HTTPS), and the browser sends `Cookie: sid=<id>` on every later request.
4. Each request looks the id up. Unknown or expired ids get `401 Unauthorized`. Logging out deletes the record.

The id is just a key; the meaning lives in the store. Sessions also need a **time-to-live** (TTL): after it, the record is gone and the user logs in again, so a stolen id stops working on its own.

## Where the session lives

**In one server's memory**, a map from session id to record inside the process, works on a laptop and fails in production. With two copies, Ada logs in on server A, her next request reaches server B, and B has never heard of her id: she is logged out at random.

**In a shared session store**, every copy of the server reads and writes the same records. Redis, an in-memory store that maps keys to values and can expire a key after a TTL (`SET sid:abc ada EX 1800`), is the usual choice because a lookup typically takes less than a millisecond inside a data center. The servers stay stateless: the state moved out of them into one place that all of them share. The cost is one more system to run and one network call per request.

## Signed tokens (JWT)

The other answer moves the session into the client. A signed **JSON Web Token** (JWT) is three base64url parts, `header.payload.signature`. The payload holds claims such as `{ "sub": "ada", "exp": 1800000000 }` (`exp` is the expiry time), and the signature is computed with a key that only the servers hold: a shared secret, or a private key whose public half lets other services verify tokens without being able to create them. A server with the secret or the public key checks the signature and the expiry without asking anyone, so there is no store to look up.

The trade-off is **revocation**. A session record can be deleted and the user is logged out at once. A signed token stays valid until its `exp` time, even after logout or a password change, because nothing on the server remembers it. Teams limit the damage with short-lived access tokens (minutes) plus a refresh token that is checked against a store, or with a list of revoked token ids, which brings back a lookup on every request. The payload is encoded, not encrypted: anyone holding the token can read it.

| | Shared session store | Signed token |
| --- | --- | --- |
| Lookup per request | yes, one store call | no, verify the signature |
| Logout takes effect | immediately | when the token expires |
| Data visible to the client | only the id | the whole payload |

## Common mistakes

- **Keeping sessions in one server's memory.** It works with one copy and breaks with two: users are logged out whenever a request reaches another server, and every restart or deploy logs out everyone.
- **Long-lived tokens with no revocation plan.** A stolen token that lasts weeks keeps working after the user logs out or changes the password.
- **Putting secrets in a JWT payload.** It is only base64url-encoded; anyone holding the token can decode and read it.
- **Guessable session ids** such as counters or user ids. Generate them from a cryptographically secure random source.

## In practice

Start with server-side sessions in a shared store: they are simple, and logout really logs out. Reach for signed tokens when many independent services must verify identity without calling a central store, and pair them with short expiry. Either way, the test of a stateless design is simple: stop any one server, and no user should notice.

## Check yourself

1. Ada logs in, and her next request is answered by a different copy of the server. What must be true for her to stay logged in?
2. Why does deleting a session record log a user out immediately, while a JWT keeps working until its `exp` time?
3. What does a TTL on a session protect against?
