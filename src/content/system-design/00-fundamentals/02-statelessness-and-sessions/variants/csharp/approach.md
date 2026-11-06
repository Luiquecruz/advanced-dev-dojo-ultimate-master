1. Decide where the state lives: only the store holds sessions. A server is a thin layer that translates store answers into HTTP responses, so any number of servers can share one store and give the same answer.
2. Record the expiry once, when the session is created (`now() + ttlMs`), instead of the creation time; then every read is a single comparison with `now()`.
3. Treat "expired" exactly like "unknown" in `Get`, and remove the expired record so the store does not keep dead sessions forever.
4. Map the store's answer to a status in `WhoAmI`: a user means `200` with the server name (it shows which copy answered), `null` means `401`.
5. Make `Logout` remove the session from the store, not from the server, so the session ends for every copy at once.
