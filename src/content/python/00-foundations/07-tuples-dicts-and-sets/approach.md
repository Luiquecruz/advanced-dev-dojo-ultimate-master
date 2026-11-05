1. For each helper, decide which container fits the result: a dict for counts, a list of tuples for a ranking, a set to remove duplicates, a new dict for the inverted phone book.
2. For `word_counts`, ask what happens the first time a word is seen, and choose a way to read a count that does not raise for a missing key.
3. For `top_words`, turn the dict into `(word, count)` tuples and write one `key` that sorts by count from high to low and then by word; slice the first `n`.
4. For `unique_tags`, clean every tag first (strip, lower-case), skip the blank ones, let a set remove the duplicates, and sort at the end because a set has no order.
5. For `invert`, loop over the entries and build a new dict, so the phone book you received stays as it was.
6. Run the tests, then the demo, and compare what it prints with what you expected.
