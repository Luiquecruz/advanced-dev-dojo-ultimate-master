Implement the crypto helpers of a webhook receiver with `node:crypto`.

1. `sha256Hex(text: string): string` returns the SHA-256 digest of `text` in hex.
2. `signWebhook(body: string, secret: string): string` returns `'sha256='` followed by the hex HMAC-SHA256 of `body` with `secret` (the format of GitHub's `X-Hub-Signature-256` header).
3. `verifyWebhook(body: string, header: string | undefined, secret: string): boolean`
   - `true` only when `header` equals the expected signature;
   - compare with `timingSafeEqual` (never `===`);
   - return `false` (never throw) for a missing header or a header of a different length.
4. `createId(prefix: string): string` returns `<prefix>_` followed by 24 lowercase hex characters from 12 cryptographically random bytes (for example `ord_9f3c0a...`). Do not use `Math.random`.
