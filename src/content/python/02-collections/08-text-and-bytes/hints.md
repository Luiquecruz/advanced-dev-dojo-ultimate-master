`bytes.decode(encoding)` raises `UnicodeDecodeError`, which is a subclass of `ValueError`. Try each encoding in a loop, return on success, and raise `ValueError` after the loop.
---
For truncation, cut the **bytes** and decode what is left: `text.encode("utf-8")[:max_bytes].decode("utf-8", errors="ignore")`. The ignore mode drops only the incomplete trailing character.
---
`unicodedata.normalize("NFC", text).casefold()` for the key. For the row: `f"{label:<10}{cents / 100:>8.2f}"`.
