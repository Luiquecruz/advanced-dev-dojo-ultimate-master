Write four word and tag helpers in `main.py`. None of them may change the dict or list it receives.

## `word_counts(text)`

Return a dict that maps every word of `text` to the number of times it appears. Words are separated by whitespace and counted without regard to case: `word_counts("Tea tea cake") == {"tea": 2, "cake": 1}`. Blank text gives `{}`.

## `top_words(counts, n)`

`counts` is a dict like the one `word_counts` returns. Return a list of at most `n` `(word, count)` tuples, the highest count first; words with the same count are ordered from A to Z.

## `unique_tags(tags)`

`tags` is a list of strings typed by people. Return a sorted list of the distinct tags after stripping the spaces around each one and lower-casing it. Tags that are blank after stripping are dropped: `unique_tags([" Python", "python ", "", "Web"]) == ["python", "web"]`.

## `invert(phonebook)`

`phonebook` maps names to phone numbers, and no two names share a number. Return a new dict that maps each number back to its name.

Press **Run** to try the helpers through `demo.py`.
