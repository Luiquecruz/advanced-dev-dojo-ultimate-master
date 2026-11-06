Python 3 separates **text** from **data**:

- `str` is a sequence of Unicode **code points**.
- `bytes` is a sequence of integers from 0 to 255.

Converting between them always needs an **encoding**.

```py
text = "café"
data = text.encode("utf-8")       # b'caf\xc3\xa9'  5 bytes
data.decode("utf-8")              # 'café'
len(text), len(data)              # (4, 5)
```

Mixing them fails loudly: `"a" + b"b"` raises `TypeError`. Always pass the encoding explicitly in file and network code (`open(path, encoding="utf-8")`).

From Python 3.15, UTF-8 mode is on by default ([PEP 686](https://peps.python.org/pep-0686/)), so `open(path)` without an `encoding` uses UTF-8 instead of the locale encoding. Earlier versions still use the locale (often cp1252 on Windows), so code that supports them must keep passing `encoding=` explicitly.

## How it works

`encode` turns text into bytes and `decode` turns bytes back into text, both with a named encoding. UTF-8 uses 1 byte for ASCII characters and 2 to 4 bytes for every other code point, so the byte length of a text is at least its `len`, and larger as soon as it holds a non-ASCII character. Decoding checks that the bytes form valid characters in that encoding:

```py
b"caf\xe9".decode("utf-8")                       # UnicodeDecodeError
b"caf\xe9".decode("utf-8", errors="replace")     # 'caf�'
b"caf\xe9".decode("latin-1")                     # 'café'
```

`errors="ignore"` drops undecodable bytes, `"replace"` inserts U+FFFD. Both **lose data silently**: use them deliberately, never by default. `latin-1` maps every byte to a character, so it never fails, which also means it can decode garbage.

## Common mistakes

**Truncating by characters when the limit is in bytes.** A database column or a protocol field limited to 10 bytes counts encoded bytes, but `text[:10]` counts code points. With accented letters or emoji the result is still too long; cutting the bytes blindly instead can split a character in half:

```py
text = "a😀b"
text[:3]                                          # wrong: 'a😀b', 6 bytes for a 3-byte limit
text.encode("utf-8")[:3].decode("utf-8")          # wrong: UnicodeDecodeError, the emoji was cut
text.encode("utf-8")[:3].decode("utf-8", errors="ignore")   # right: 'a', 1 byte
```

Here `errors="ignore"` is deliberate: it drops only the incomplete character left at the cut.

**Comparing user-facing text with `lower()`.** `"STRASSE".lower() == "straße".lower()` is `False`; normalize and `casefold()` as shown below.

## What `len` counts

`len(text)` counts code points, not what a person sees as a character.

```py
len("😀")                    # 1   one code point, 4 bytes in UTF-8
len("é")               # 2   an "e" plus a combining accent
"é" == "é"            # False: same appearance, different code points
```

Normalize before comparing: `unicodedata.normalize("NFC", text)` composes characters. For case-insensitive comparison use `casefold()`, not `lower()`: `"straße".casefold()` is `"strasse"`. `NFC` then `casefold()` covers everyday keys; the Unicode standard's full canonical caseless match is `NFD(casefold(NFD(text)))`, because case folding can itself produce text that is no longer normalized.

Even code points are not what a reader calls a character. A flag, a skin-toned emoji like `👍🏽` or a letter with a combining accent is one **grapheme cluster** made of several code points, and cutting by code points or bytes can split it. The standard library has no grapheme segmentation; the third-party `regex` module matches clusters with `\X`.

### Matching is not security

NFC plus `casefold()` is right for **matching** user-facing text: search keys, tags, header names. It is not enough for **security-sensitive identifiers** such as usernames, account handles or domain names, where an attacker picks the spelling:

```py
normalize_key("ＡＤＭＩＮ") == normalize_key("admin")   # False: fullwidth letters survive NFC
unicodedata.normalize("NFKC", "ＡＤＭＩＮ").casefold()   # 'admin'
normalize_key("аdmin") == normalize_key("admin")     # False, and NFKC cannot fix it: the first 'а' is Cyrillic
```

Such identifiers also need **NFKC** compatibility normalization (it folds fullwidth forms and ligatures) and **confusable (homoglyph) detection** as defined by Unicode TR39 (UTS #39), plus a mapping like UTS #46 for domain names. The standard library provides none of the confusable checks, and its `idna` codec implements only the older IDNA 2003; use a vetted library (the `idna` package, a PRECIS implementation for usernames) and restrict the allowed scripts.

## Formatting text

```py
label, price = "Coffee", 4.5
f"{label:<10}{price:>8.2f}"      # 'Coffee        4.50'
f"{price=}"                      # 'price=4.5'
f"{1234567:,}"                   # '1,234,567'
```

An **f-string** is a string literal with an `f` before the quote. Python evaluates each expression inside `{}` and inserts its text; the part after `:` is the **format spec**: alignment (`<`, `>`, `^`), width, precision and type. `{value!r}` inserts `repr(value)` instead of `str(value)`, which shows strings with their quotes and writes special characters as escapes (a newline appears as `\n`): `f"{label!r}"` gives `'Coffee'`, quotes included.

## When to choose it

- **`str` internally, `bytes` at the edges** (files, sockets, hashing). Decode on the way in, encode on the way out.
- **UTF-8** unless a protocol says otherwise.
- **`casefold()` and NFC normalization** for search keys and matching user-facing text; **NFKC plus confusable checks from a vetted library** for usernames and domains.
- **`errors="replace"`** for logs and display; **strict** for data you will process.
