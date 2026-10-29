`Buffer.byteLength(text, 'utf8')` measures bytes. `Buffer.from(text, 'utf8').toString('base64')` encodes, and `Buffer.from(value, 'base64').toString('utf8')` decodes.
---
For `decodeBasicAuth`, a case-insensitive regex such as `/^basic (.+)$/i` checks the scheme and captures the base64 part. Then use `indexOf(':')` and two `slice` calls instead of `split(':')`.
---
`truncateBytes`: loop with `for (const char of text)` (whole code points), add `Buffer.byteLength(char)` to a running total and `break` before it exceeds `maxBytes`. `decodeChunks` is one line: `Buffer.concat(chunks).toString('utf8')`.
