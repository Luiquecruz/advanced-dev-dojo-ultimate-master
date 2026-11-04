1. Model a credential as data with an owner (the tool), a purpose (scopes) and a lifetime (issued and expiry instants from an injected clock). Everything else is checking those fields.
2. Make the broker refuse rather than trim: a request for a scope outside the grant is a bug or an attack, and both deserve an error, not a silently narrower token.
3. Verify in a fixed order so the reason is useful: unknown, expired, wrong tool, missing scope. Revocation simply makes a token unknown.
4. Keep secrets out of the model's world by giving it names. Resolve names to values only at the boundary, only for secrets granted to that tool, and fail with the name (never the value) when a call asks for something else.
5. Assume tools leak. Redact every secret in each encoding an HTTP client or logger is likely to produce, longest first, including the call's own credential.
6. Write the executor as a pipeline where every exit goes through the same redacting reply, and revoke the credential in a `finally` so no path leaves a live token behind.
7. Audit what the model asked for, with placeholders, so the log is useful for investigations and safe to ship to a third party.
