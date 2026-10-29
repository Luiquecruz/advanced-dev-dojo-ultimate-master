Replace the fast, unsalted SHA-256 "password hashing" in the starter with salted PBKDF2, in the same string format Django uses. Use `pbkdf2` (or `pbkdf2Sync`), `randomBytes` and `timingSafeEqual` from `node:crypto`.

The exported constants are the policy: `ITERATIONS = 1000`, `KEY_LENGTH = 32` bytes, `SALT_BYTES = 16`. (1000 iterations keeps the in-browser runtime fast; production uses 600 000 or more, see the theory.)

## Stored format

```text
pbkdf2_sha256$<iterations>$<salt as base64>$<hash as base64>
```

## Functions

1. `hashPassword(password): Promise<string>` generates a new random 16-byte salt, derives `KEY_LENGTH` bytes with PBKDF2-HMAC-SHA256 from the password and the **salt bytes** (the `Buffer`, not its base64 text) with `ITERATIONS`, and returns the stored format.
2. `verifyPassword(password, stored): Promise<boolean>` parses `stored`, derives again with the **stored** salt and iteration count and a key length equal to the stored hash's byte length, and compares the two buffers with `timingSafeEqual`. It returns `false`, never throws, when the value is malformed: not exactly 4 `$`-separated parts, an algorithm other than `pbkdf2_sha256`, or an iteration count that is not a positive integer.
3. `needsRehash(stored): boolean` is `true` when the value is not a valid `pbkdf2_sha256` hash or uses fewer than `ITERATIONS` iterations.
4. `login(users, email, password): Promise<boolean>`: `users` is a `Map` from email to stored hash. Return `false` for an unknown email or a wrong password (leaving the map untouched). On success, when `needsRehash` is `true`, replace the stored value with `await hashPassword(password)`; then return `true`.
