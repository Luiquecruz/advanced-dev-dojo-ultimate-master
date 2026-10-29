1. Pick the primitive per job: a plain hash for fingerprints, an HMAC when a secret must prove the origin, random bytes for identifiers.
2. Build the expected signature with the same function the sender uses (`signWebhook`), so signing and verifying cannot drift apart.
3. Treat every malformed input as "not valid": a missing header or a different length returns `false` before the constant-time comparison runs.
4. Compare equal-length buffers with `timingSafeEqual` so the response time does not reveal how many characters matched.
5. Generate ids from `randomBytes`, encode them as hex for a predictable length, and add a readable prefix.
6. Run the program: changing one character of the body makes verification fail, which is the whole point of the HMAC.
