Encoding is three `replace` calls on `buffer.toString('base64')`: `/\+/g` → `-`, `/\//g` → `_`, `/=+$/` → `''`. Decoding reverses the first two and pads with `=` up to a multiple of 4: `base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')`.
---
The signature is `base64UrlEncode(createHmac('sha256', secret).update(\`${header}.${payload}\`).digest())`. Put it in a helper: `sign` and `verify` must compute it the same way.
---
In `verify`, write a `parseJson(part)` helper that wraps `JSON.parse(base64UrlDecode(part).toString('utf8'))` in `try/catch` and throws `new JwtError('Malformed token')` for errors or non-objects. Compare signatures as `Buffer.from(expected)` and `Buffer.from(received)`: check `expected.length !== actual.length` first, because `timingSafeEqual` throws on different lengths. Only then parse the payload and check `exp`.
