Build HS256 JSON Web Tokens with `createHmac` and `timingSafeEqual` from `node:crypto`. `JwtError` and the `JwtPayload` type are given. The runtime's `Buffer` has no `base64url` encoding: convert from `base64`.

## `base64UrlEncode(input)` and `base64UrlDecode(input)`

- `base64UrlEncode(string | Buffer): string`: strings are UTF-8. Encode as base64, then replace `+` with `-`, `/` with `_`, and remove the trailing `=` padding.
- `base64UrlDecode(string): Buffer`: the reverse (restore `+`, `/` and the padding, decode base64).

## `sign(payload, secret, options?)`

`options` is `{ expiresInSeconds?, now? }`; `now` returns milliseconds and defaults to `Date.now`.

1. Claims are `{ ...payload, iat }` with `iat = Math.floor(now() / 1000)`, plus `exp = iat + expiresInSeconds` when `expiresInSeconds` is given (in that key order).
2. Header is exactly `{ "alg": "HS256", "typ": "JWT" }`.
3. Return `base64url(JSON header) + "." + base64url(JSON claims) + "." + signature`, where the signature is the base64url HMAC-SHA256 of `"<header>.<payload>"` (the two encoded parts) with `secret` as the key.

## `verify(token, secret, options?)`

`options` is `{ now? }`. Check in this order and throw a `JwtError` with the exact message:

| Check | Message |
| --- | --- |
| The token does not have exactly 3 parts separated by `.`, or the header or payload is not a base64url JSON object | `Malformed token` |
| The header's `alg` is not `HS256` (this rejects `"none"`) | `Unsupported algorithm` |
| The signature differs from the expected one (compare with `timingSafeEqual`; different lengths are a mismatch, not a crash) | `Invalid signature` |
| The payload has a numeric `exp` and `Math.floor(now() / 1000) >= exp` | `Token expired` |

Return the payload object when everything passes. Your tokens must verify with `hono/jwt` and tokens signed by `hono/jwt` must verify with yours.
