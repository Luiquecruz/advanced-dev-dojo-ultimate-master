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

## How it works

Each method answers a different question, and two pattern symbols match more than a first reading suggests:

```py
re.match(r"ERROR", "> ERROR")          # None: match only tries position 0
re.match(r"[0-9]+", "123 and more")    # a match for '123': the rest of the text is ignored
re.match(r"^\d+$", "123\n")            # a match: $ also matches before a final newline
re.fullmatch(r"\d+", "٣")              # a match: \d is any Unicode decimal digit
re.sub(r"a", "b", "a-a")               # 'b-b'; pass count=1 to replace only the first
```

- `match` anchors at the start and stops when the pattern ends; `search` tries every position; `fullmatch` succeeds only when the pattern covers the text from its first to its last character.
- `$` matches at the very end **or just before a newline at the end**. `\z` (Python 3.14) and `fullmatch` mean the true end.
- In `str` patterns `\d`, `\w`, `\s` and `\b` follow Unicode: `\d` accepts Arabic-Indic `٣` and Devanagari `३`. Write `[0-9]`, or pass `re.ASCII`, when you mean ASCII.
- Named groups are written `(?P<name>…)` and read back with `group("name")` or `groupdict()`; `(?<name>…)` is a `re.error`.

`re` is a backtracking engine. A quantifier first takes as much as it can (greedy) and gives characters back one at a time when the rest of the pattern fails; `+?` and `*?` take as little as possible (lazy). For `"[billing] retry [2/5]"`, `\[(.+)\]` captures `billing] retry [2/5`, `\[(.+?)\]` captures `billing`, and the negated class `\[([^\]]+)\]` captures `billing` without any backtracking, which makes it the clearest choice. `re.VERBOSE` lets you spread a long pattern over lines with comments; inside it, write a literal space as `\x20` or `[ ]`. `sub` accepts a function that receives each `Match` and returns the replacement.

## Common mistakes

**Validating with `re.match(r"^…$", text)`.** `match` only proves that the text *starts* with the format, and `$` lets a trailing `"\n"` through, so a line with an injected newline passes the check:

```py
# wrong: accepts "ORD-123456\n" and, through \d, "ORD-١٢٣٤٥٦"
def is_order_id(text):
    return re.match(r"^ORD-\d{6}$", text) is not None

# right: the whole text, ASCII digits only
def is_order_id(text):
    return re.fullmatch(r"ORD-[0-9]{6}", text) is not None
```

**Leaving out the `r` prefix.** In `"\bORD"` the string turns `\b` into a backspace character before `re` sees it, and the pattern silently never matches.

## Security note

Backtracking makes some patterns slow on text that almost matches, and `re` has no timeout:

- **Nested quantifiers** such as `(a+)+$` or `(\w+\s?)*$` try exponentially many ways to split the input when it fails to match; a few dozen characters can take seconds.
- **Unbounded runs with `search`**: `[\w.]+@` on 20,000 letters without an `@` starts at every position and scans to the end each time. That is quadratic, and it is the classic email-regex denial of service.

Defend in this order: bound the input length before matching, bound the quantifiers (`[\w.]{1,64}@`), keep character classes that cannot overlap, anchor with `fullmatch`, and use atomic groups `(?>…)` or possessive quantifiers (`a++`) to forbid backtracking. A regex is not an email validator either: masking or extracting addresses is fine, but accepting an address means sending a confirmation message to it.

Atomic groups and possessive quantifiers exist since Python 3.11, and Python 3.14 added `\z` as an unambiguous end-of-string anchor (`\Z` is its older spelling). Python 3.15 added `re.prefixmatch()` as a more descriptive name for `re.match()` and soft deprecated the old name, which readers easily mistake for "match anywhere". This track runs 3.14, so its lessons use `match`.

## When to choose it

- **`re`** for tokenizing, extracting and masking text with a known shape: log lines, ids, simple formats.
- **`fullmatch`** whenever the question is "is this whole string valid?".
- **String methods** (`startswith`, `split`, `partition`, `in`) when they are enough: they are faster and cannot backtrack.
- **A real parser** (`json`, `csv`, `email.utils`, `urllib.parse`, `datetime.fromisoformat`) for formats that have one; a regex for nested or escaped structures grows unreadable and fragile.
