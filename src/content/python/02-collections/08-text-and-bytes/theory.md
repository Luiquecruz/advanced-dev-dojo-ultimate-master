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

> **Status as of November 2026:** Python 3.15 turns on UTF-8 mode by default ([PEP 686](https://peps.python.org/pep-0686/)), so `open(path)` without an `encoding` uses UTF-8 instead of the locale encoding. Earlier versions still use the locale (often cp1252 on Windows), so code that supports them must keep passing `encoding=` explicitly.

## Decoding errors

```py
b"caf\xe9".decode("utf-8")                       # UnicodeDecodeError
b"caf\xe9".decode("utf-8", errors="replace")     # 'caf�'
b"caf\xe9".decode("latin-1")                     # 'café'
```

`errors="ignore"` drops undecodable bytes, `"replace"` inserts U+FFFD. Both **lose data silently**: use them deliberately, never by default. `latin-1` maps every byte to a character, so it never fails, which also means it can decode garbage.

## What `len` counts

`len(text)` counts code points, not what a person sees as a character.

```py
len("😀")                    # 1   (JavaScript: "😀".length === 2)
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

The part after `:` is the **format spec**: alignment (`<`, `>`, `^`), width, precision and type.

## Coming from TypeScript and JavaScript

- JavaScript strings are UTF-16 code units, so `"😀".length` is `2`. Python counts code points.
- JavaScript has no bytes type besides `Uint8Array`, and `TextEncoder`/`TextDecoder` play the role of `encode`/`decode`.
- Template literals interpolate with `${}`; f-strings use `{}` and add a format mini-language.

## When to choose it

- **`str` internally, `bytes` at the edges** (files, sockets, hashing). Decode on the way in, encode on the way out.
- **UTF-8** unless a protocol says otherwise.
- **`casefold()` and NFC normalization** for search keys and matching user-facing text; **NFKC plus confusable checks from a vetted library** for usernames and domains.
- **`errors="replace"`** for logs and display; **strict** for data you will process.
