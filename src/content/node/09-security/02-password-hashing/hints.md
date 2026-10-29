`const derive = promisify(pbkdf2)` gives you `await derive(password, salt, iterations, keyLength, 'sha256')`, which resolves with a `Buffer`. Build the stored string with a template literal and `buffer.toString('base64')`.
---
Write one `parse(stored)` helper used by both `verifyPassword` and `needsRehash`: `stored.split('$')` must give 4 parts, the first must be `pbkdf2_sha256`, and the iteration count must match `/^[1-9]\d*$/`. Return `null` when anything is off, otherwise `{ iterations, salt: Buffer.from(salt, 'base64'), hash: Buffer.from(hash, 'base64') }`.
---
`timingSafeEqual` throws when the lengths differ, so derive exactly `parsed.hash.length` bytes and guard against an empty hash. In `login`: `if (!stored || !(await verifyPassword(password, stored))) return false;`, then rehash when `needsRehash(stored)` and return `true`.
