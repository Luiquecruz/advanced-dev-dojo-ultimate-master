# Password Hashing

Databases leak: backups, SQL injection, a misconfigured bucket. When they do, the question is how many passwords the attacker can recover. With good hashing the answer is "very few, very slowly". With a fast hash it is "most of them by tomorrow", and since people reuse passwords, your leak becomes their email account.

## Why not encryption, why not SHA-256

- **Encryption is reversible.** Whoever has the key (an attacker with your server, a rogue insider) gets every password. You never need the plaintext back, only to check a guess.
- **Plain hashes are fast.** SHA-256 is designed for speed: a single GPU computes billions per second, so an 8-character password falls quickly. Without a salt, identical passwords have identical hashes, and precomputed **rainbow tables** crack common ones instantly.

Password hashing combines two ideas: a **unique random salt** per password and a **deliberately slow function** whose cost you can raise over time.

## The algorithms

| Algorithm | Cost knobs | Status |
| --- | --- | --- |
| Argon2id | memory, iterations, parallelism | OWASP's first choice; memory-hard, so GPUs gain little |
| scrypt | memory (`N`, `r`, `p`) | good, memory-hard; built into `node:crypto` |
| bcrypt | rounds (cost 10–12+) | fine for existing systems; truncates input at 72 bytes |
| PBKDF2-HMAC-SHA256 | iterations | FIPS-approved; needs a very high count (OWASP: 600 000) |

PBKDF2 is the one every platform has (WebCrypto, `node:crypto`, every language), which is why this lesson builds it. In a real Node project prefer `crypto.scrypt` or the `argon2` package. The Dev Dojo runtime implements PBKDF2 in plain JavaScript, so the exercise uses only 1000 iterations; **never** ship a count that low.

## PBKDF2 in Node.js

```ts
import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(pbkdf2);

const salt = randomBytes(16);
const hash = await derive(password, salt, 600_000, 32, 'sha256');
const stored = `pbkdf2_sha256$600000$${salt.toString('base64')}$${hash.toString('base64')}`;
```

Use the async version: `pbkdf2Sync` with 600 000 iterations blocks the event loop for hundreds of milliseconds, freezing every other request. The async one runs on the libuv thread pool.

The stored string is **self-describing**: algorithm, cost, salt and hash travel together (Django uses this exact format; bcrypt and Argon2 have their own `$`-separated formats). That lets you raise the cost later without breaking existing users.

## Verifying

```ts
const [, iterations, salt, expected] = stored.split('$');
const expectedBytes = Buffer.from(expected, 'base64');
const candidate = await derive(password, Buffer.from(salt, 'base64'), Number(iterations), expectedBytes.length, 'sha256');
return timingSafeEqual(candidate, expectedBytes);
```

`===` on strings returns as soon as one character differs, so response times leak how much of the value matched. `timingSafeEqual` compares every byte; it throws when lengths differ, so derive the same length you stored.

## Raising the cost over time

Hardware gets faster, so the policy changes. You cannot rehash without the plaintext, but at login you have it: verify with the old parameters, and if the stored hash is weaker than the current policy (`needsRehash`), save a new hash. Users who never log in again keep the old hash; some teams wrap those (hash the old hash with the new algorithm) during a migration.

## Pitfalls

- A global salt, or the user id as salt: salts must be random per password.
- `Math.random()` for salts or tokens: use `crypto.randomBytes`.
- Different errors for "unknown email" and "wrong password", or skipping the hash for unknown emails (the faster response reveals which emails exist). Return one message and run a dummy verification.
- No rate limiting on login (lesson 5) or no length limit: a 1 MB password makes every hash expensive.
- Logging request bodies on the login route: the plaintext ends up in your log storage.

## When to choose it

If an auth provider or library can own passwords for you, let it: passkeys or social login remove the stored secret altogether. When you must store passwords, choose Argon2id (the `argon2` package) or `crypto.scrypt` for new systems; PBKDF2 at 600 000+ iterations when FIPS compliance requires it; keep bcrypt in systems that already use it with cost 12 or more. Tune the cost so one hash takes roughly 100–500 ms on your production hardware, and add a pepper from a secret manager if your threat model includes database-only leaks.

## Working with AI

Ask for "Argon2id (or scrypt) with per-user salts, a self-describing stored format, constant-time comparison and rehash on login". Review checklist:

- No `createHash('sha256')`, MD5 or encryption for passwords; a slow KDF with a real cost.
- Salt from `randomBytes`, at least 16 bytes, stored per hash.
- Comparison with `timingSafeEqual` (or the library's `verify`), never `===`.
- Async hashing on request paths; no `*Sync` KDF inside handlers.
- Same response for unknown users and wrong passwords; login is rate limited; passwords are never logged.
