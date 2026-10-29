1. A JWT is three base64url parts: header, payload, signature. Start with the encoding helpers, because every other step depends on them and the jwt.io token gives you an exact reference to compare against.
2. Signing is deterministic: the same claims, key order, secret and `iat` always give the same token. Build the claims object in the documented order so the output matches other libraries byte for byte.
3. Verification must decide whether to trust the payload before reading it. Check the structure, then pin the algorithm (never let the token choose it), then recompute the signature over the received header and payload.
4. Compare signatures in constant time and treat a length mismatch as an invalid signature, not as an exception that escapes as a 500.
5. Only after the signature is valid, read the claims and enforce `exp` against an injected clock, so expiry is testable without waiting.
6. Interoperability with `hono/jwt` is the final proof that you implemented the standard and not a private variant.
