Hash and HMAC share the same chain: `createHash('sha256').update(text).digest('hex')` and `createHmac('sha256', secret).update(body).digest('hex')`.
---
`timingSafeEqual` takes two `Buffer`s and throws when their lengths differ. Return `false` early for a missing header, then build `Buffer.from(expected)` and `Buffer.from(header)` and compare their `length` before calling it.
---
`return expected.length === received.length && timingSafeEqual(expected, received);` keeps it to one line. For ids: `` `${prefix}_${randomBytes(12).toString('hex')}` `` (12 bytes are 24 hex characters).
