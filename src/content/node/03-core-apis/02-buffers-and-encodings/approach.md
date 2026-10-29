1. Decide the unit for each function: `byteLength` and `truncateBytes` measure UTF-8 bytes, everything else converts between bytes and strings.
2. Encode Basic auth by building the `user:password` string first, turning it into bytes with `Buffer.from`, then printing those bytes as base64.
3. Decode in the opposite order: validate the scheme, base64 to bytes, bytes to UTF-8 text, then split once on the first `:` so passwords keep their colons.
4. Truncate by walking code points (`for...of`), not by slicing bytes: a byte slice can end in the middle of a character.
5. For chunks, combine the raw bytes with `Buffer.concat` and decode once; decoding each chunk separately corrupts any character on a boundary.
