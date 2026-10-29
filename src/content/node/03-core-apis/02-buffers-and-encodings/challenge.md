Implement five byte-level helpers. Every input string is UTF-8.

1. `byteLength(text: string): number` returns the number of UTF-8 bytes (`'héllo'` is `6`, `'👋'` is `4`).
2. `encodeBasicAuth(user: string, password: string): string` returns `'Basic '` followed by the base64 of `user:password`.
3. `decodeBasicAuth(header: string): { user: string; password: string } | null` reverses it:
   - the scheme `Basic` is case-insensitive and followed by one space;
   - split the decoded text on the **first** `:` only (passwords may contain `:`);
   - return `null` for any other scheme or when the decoded text has no `:`.
4. `truncateBytes(text: string, maxBytes: number): string` returns the longest prefix of `text` whose UTF-8 size is at most `maxBytes`, never cutting a character in half (`truncateBytes('👋👋', 5)` is `'👋'`).
5. `decodeChunks(chunks: Buffer[]): string` decodes chunks received from a stream into one string, even when a character is split across two chunks.
