Write four small text and list helpers in `main.py`. None of them may change the list it receives.

## `initials(full_name)`

Return the first letter of every word, upper-cased and followed by a dot: `initials("ada lovelace") == "A.L."`. Extra spaces between or around the words make no difference: `initials("  grace  brewster hopper ") == "G.B.H."`. A blank name gives `""`.

## `last_items(items, n)`

Return the last `n` items of the list `items` as a **new** list. When `n` is 0 the result is `[]`, and when `n` is larger than the list the result is a copy of every item. `n` is never negative.

## `clean_words(text)`

Return the words of `text`, lower-cased, with the characters of the constant `PUNCTUATION` (`.,!?;:`) removed from both ends of each word. Words that are only punctuation are dropped: `clean_words("Hello, world! ... Hello?") == ["hello", "world", "hello"]`.

## `highest(scores, n)`

Return the `n` highest numbers of the list `scores`, highest first, as a new list. The caller's `scores` keeps its original order.

Press **Run** to try the helpers through `demo.py`.
