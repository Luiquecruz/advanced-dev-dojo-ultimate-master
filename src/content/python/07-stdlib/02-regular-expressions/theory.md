`re` compiles a pattern once and offers three ways to apply it, plus iteration and substitution:

```py
import re

LINE = re.compile(r"(?P<level>[A-Z]+) \[(?P<service>[^\]]+)\] (?P<message>.+)")

LINE.match("ERROR [api] timeout x")       # anchored at the start only
LINE.search("> ERROR [api] timeout")      # anywhere in the text
LINE.fullmatch("ERROR [api] timeout")     # the whole text, first to last character
LINE.fullmatch("ERROR [api] timeout").groupdict()
# {'level': 'ERROR', 'service': 'api', 'message': 'timeout'}

re.sub(r"\d", "#", "pin 1234")            # 'pin ####': every match is replaced by default
[m.group() for m in re.finditer(r"\d+", "a1 b22")]   # ['1', '22']
```

Write patterns as raw strings (`r"\d"`), so backslashes reach the regex engine instead of being string escapes.

## Coming from TypeScript and JavaScript

The syntax looks familiar; the meanings of a few names do not:

```ts
/ERROR/.test("> ERROR");        // true: test and String.match search anywhere
/^\d+$/.test("123\n");          // false: $ is the very end without the m flag
/\d/.test("٣");                 // false: \d is always [0-9]
"a-a".replace(/a/, "b");        // "b-a": one replacement unless /g
```

```py
re.match(r"ERROR", "> ERROR")          # None: match only tries position 0
re.match(r"^\d+$", "123\n")            # a match: $ also matches before a final newline
re.fullmatch(r"\d+", "٣")              # a match: \d is any Unicode decimal digit
re.sub(r"a", "b", "a-a")               # 'b-b'
```

The mistake is validating with `re.match(r"^…$", text)` as if it were `/^…$/.test(text)`: the pattern accepts a trailing `"\n"` and, in `str` patterns, `\d`, `\w`, `\s` and `\b` follow Unicode, so `ORD-١٢٣٤٥٦` passes an `ORD-\d{6}` check. Use `fullmatch`, and `[0-9]` or the `re.ASCII` flag when you mean ASCII. Named groups are written `(?P<name>…)`: the JavaScript spelling `(?<name>…)` is a `re.error` in Python 3.14.

## How it works

`re` is a backtracking engine. A quantifier first takes as much as it can (greedy) and gives characters back one at a time when the rest of the pattern fails; `+?` and `*?` take as little as possible (lazy). For `"[billing] retry [2/5]"`, `\[(.+)\]` captures `billing] retry [2/5`, `\[(.+?)\]` captures `billing`, and the negated class `\[([^\]]+)\]` captures `billing` without any backtracking, which makes it the clearest choice. `re.VERBOSE` lets you spread a long pattern over lines with comments; inside it, write a literal space as `\x20` or `[ ]`. `sub` accepts a function that receives each `Match` and returns the replacement.

## Security note

Backtracking makes some patterns slow on text that almost matches, and `re` has no timeout:

- **Nested quantifiers** such as `(a+)+$` or `(\w+\s?)*$` try exponentially many ways to split the input when it fails to match; a few dozen characters can take seconds.
- **Unbounded runs with `search`**: `[\w.]+@` on 20,000 letters without an `@` starts at every position and scans to the end each time. That is quadratic, and it is the classic email-regex denial of service.

Defend in this order: bound the input length before matching, bound the quantifiers (`[\w.]{1,64}@`), keep character classes that cannot overlap, anchor with `fullmatch`, and use atomic groups `(?>…)` or possessive quantifiers (`a++`) to forbid backtracking. A regex is not an email validator either: masking or extracting addresses is fine, but accepting an address means sending a confirmation message to it.

> **Status as of November 2026:** atomic groups and possessive quantifiers exist since Python 3.11, and Python 3.14 added `\z` as an unambiguous end-of-string anchor (`\Z` is its older spelling). Python 3.15 adds `re.prefixmatch()` as an explicit name for `re.match()`, which it soft deprecates because other languages use `match` for what Python calls `search`. This track runs 3.14.

## When to choose it

- **`re`** for tokenizing, extracting and masking text with a known shape: log lines, ids, simple formats.
- **`fullmatch`** whenever the question is "is this whole string valid?".
- **String methods** (`startswith`, `split`, `partition`, `in`) when they are enough: they are faster and cannot backtrack.
- **A real parser** (`json`, `csv`, `email.utils`, `urllib.parse`, `datetime.fromisoformat`) for formats that have one; a regex for nested or escaped structures grows unreadable and fragile.
