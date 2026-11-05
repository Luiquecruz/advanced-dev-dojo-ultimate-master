1. Decide for each helper whether it needs a loop at all: `split`, `join`, slices and `sorted` already do most of the work.
2. For `initials`, split the name into words, take the first character of each, upper-case it and add a dot, then join the pieces into one string.
3. For `last_items`, work out the index where the last `n` items start, and check the two edge cases by hand: `n == 0` and `n` larger than the list.
4. For `clean_words`, lower-case the text, split it, strip `PUNCTUATION` from each word and keep only the words that are not empty.
5. For `highest`, build a new sorted list instead of sorting the argument, then take the first `n` items.
6. Run the tests and the demo; the demo prints the original scores again so you can see that they kept their order.
