# Crypto Basics

`node:crypto` covers the cryptography a typical API needs day to day: hashing content, signing and verifying messages, generating unguessable ids, and comparing secrets safely. Passwords and tokens get their own lessons in the security module; this one is about choosing the right primitive.

## Hashes: fingerprints of data

A hash function maps any input to a fixed-size digest. The same input always gives the same digest; a one-bit change gives a completely different one; you cannot go back from digest to input.

```ts
import { createHash } from 'node:crypto';

createHash('sha256').update('hello').digest('hex');
// '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
```

Uses: ETags and cache keys, deduplicating uploads, verifying downloads, content-addressed storage. Use **SHA-256** (or SHA-512); MD5 and SHA-1 are broken for anything security related. Never hash **passwords** with a plain fast hash: attackers try billions of guesses per second. Passwords need a slow, salted function (`scrypt`, `argon2`, PBKDF2 with 600 000+ iterations), covered in the security module.

## HMAC: proving who sent a message

A hash proves integrity, not origin: anyone can recompute it. An **HMAC** mixes a secret key into the hash, so only holders of the key can produce a valid signature. This is how webhook providers (GitHub, Stripe, Shopify) let you verify that a request really came from them:

```ts
import { createHmac } from 'node:crypto';

const signature = createHmac('sha256', process.env.WEBHOOK_SECRET!).update(rawBody).digest('hex');
// GitHub sends it as the header: X-Hub-Signature-256: sha256=<signature>
```

Sign the **raw body bytes** exactly as received. Re-serializing parsed JSON changes whitespace or key order and the signature no longer matches; that is why webhook routes usually skip the JSON body parser.

## Comparing secrets in constant time

`a === b` stops at the first different character. By measuring response times over many requests, an attacker can learn a valid signature one character at a time. `timingSafeEqual` always compares every byte:

```ts
import { timingSafeEqual } from 'node:crypto';

const expected = Buffer.from(computed);
const received = Buffer.from(header);
const valid = expected.length === received.length && timingSafeEqual(expected, received);
```

`timingSafeEqual` **throws** when the lengths differ, so check the length first and treat a mismatch as "invalid", never as a 500. Length is not secret (every valid signature has the same length).

## Random values

`Math.random()` is predictable and must never produce anything an attacker benefits from guessing: session ids, reset tokens, API keys, invite codes.

```ts
import { randomBytes, randomUUID, randomInt } from 'node:crypto';

randomUUID();                       // 'f4c1...'  v4 UUID, 122 random bits
randomBytes(32).toString('hex');    // 256-bit token
randomInt(100000, 1000000);         // 6-digit one-time code, uniform
```

For readable ids, add a prefix (`ord_`, `key_`) like Stripe does: logs and support tickets become self-explanatory. For ids that should sort by creation time (database primary keys), look at UUID v7 or ULID.

## Which primitive?

| Need | Use | Not |
| --- | --- | --- |
| Detect changes / cache key | `createHash('sha256')` | MD5 |
| Verify a message came from a partner | `createHmac('sha256', secret)` + `timingSafeEqual` | plain hash, `===` |
| Unguessable token or id | `randomBytes`, `randomUUID` | `Math.random`, `Date.now()` |
| Store passwords | `scrypt` / `argon2` with salt | `sha256(password)` |
| Encrypt data you must read back | `createCipheriv('aes-256-gcm')` or a KMS | base64, hashing |
| Browser and edge compatible | `crypto.subtle` (Web Crypto), global in Node | |

Node also exposes the Web Crypto API as `globalThis.crypto`; it is async and portable, while `node:crypto` is synchronous and richer.

## When to choose it

Use `node:crypto` for hashes, HMAC signatures, random ids and constant-time checks: these are small, standard and safe to write yourself. Do not invent protocols: for authentication, sessions, JWT and encryption at rest, prefer a vetted library or a managed service (an auth provider, a KMS), and use `node:crypto` directly only when you understand the full protocol. For portable code (edge functions, browsers), choose Web Crypto.

## Working with AI

Name the primitive you want ("HMAC-SHA256 of the raw body, compared with `timingSafeEqual`"); vague prompts like "secure the webhook" produce plausible but weak code. Review generated code for:

- `Math.random()` or timestamps in tokens and ids;
- `===` or `==` comparing signatures, tokens or API keys;
- `timingSafeEqual` without a length check (it throws);
- signatures computed over `JSON.stringify(req.body)` instead of the raw body;
- MD5 or SHA-1, or fast hashes for passwords;
- secrets hard-coded instead of read from configuration.
