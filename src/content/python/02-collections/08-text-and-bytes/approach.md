1. Keep `str` and `bytes` straight for each helper: what comes in, what goes out.
2. `decode_lenient`: try the encodings in order, treating decode errors as "try the next one".
3. `truncate_utf8`: operate on bytes, then decode so a partial character at the cut disappears.
4. `normalize_key`: normalize first, then fold the case, and check both examples from the contract.
5. `money_row`: translate the column widths and alignment into a format spec.
