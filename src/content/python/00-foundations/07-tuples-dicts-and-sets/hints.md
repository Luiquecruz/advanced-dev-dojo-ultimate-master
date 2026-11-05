Start `word_counts` from an empty dict and loop over `text.lower().split()`. `counts.get(word, 0)` is 0 for a word you have not seen yet, so `counts[word] = counts.get(word, 0) + 1` works for the first time and every later time.
---
`counts.items()` gives `(word, count)` tuples. Sort them with `key=lambda pair: (-pair[1], pair[0])`: the minus sign puts high counts first and the word breaks ties. Finish with the slice `[:n]`.
---
A set drops duplicates for you. Build it from the stripped, lower-cased tags that are not empty, then return `sorted(...)` of it, which is a list.
---
`for name, number in phonebook.items():` gives both sides of each entry; store them the other way round in a new dict, or write the same thing as a dict comprehension: `{number: name for name, number in phonebook.items()}`.
