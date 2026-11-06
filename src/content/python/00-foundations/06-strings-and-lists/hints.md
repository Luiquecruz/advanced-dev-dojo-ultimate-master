`"ada lovelace".split()` gives `["ada", "lovelace"]` and ignores extra spaces. For each word, `word[0].upper()` is its initial; collect them in a list and finish with `"".join(...)`, or add `"."` to each initial as you go.
---
A slice that starts at `len(items) - n` ends at the end of the list. When `n` is larger than the list that number is negative, and a negative start counts from the end, so wrap it: `max(len(items) - n, 0)`.
---
`word.strip(PUNCTUATION)` removes those characters from both ends, and a word made only of punctuation becomes `""`. Build the stripped words with one comprehension, then keep the non-empty ones with a second: `[word for word in stripped if word]`.
---
`sorted(scores, reverse=True)` is a new list, so slicing it with `[:n]` never touches `scores`. Calling `scores.sort()` would reorder the caller's list.
