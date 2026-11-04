Write four text helpers in `main.py`.

## `decode_lenient(data, encodings=("utf-8", "latin-1"))`

Try each encoding in order and return the text of the first one that decodes `data` without error. If none works, raise `ValueError`.

## `truncate_utf8(text, max_bytes)`

Return the longest prefix of `text` whose UTF-8 encoding is at most `max_bytes` long, **never splitting a character**. The result is a `str`.

## `normalize_key(text)`

Return a key for case-insensitive, appearance-insensitive matching: NFC-normalized and case-folded. `"É"` and `"É"` give the same key, and so do `"STRASSE"` and `"straße"`.

## `money_row(label, cents)`

Return one table row: the label left-aligned in 10 characters followed by the amount in euros right-aligned in 8 characters with two decimals. `money_row("Coffee", 450)` is `"Coffee    "` + `"    4.50"`. Use an f-string format spec.
