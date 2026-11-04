1. For each helper, find the one value that is computed, tested and then used: the chunk, the matching item, the parsed pair. Each fix is about binding that value once at the right place.
2. In `read_chunks`, move the read into the loop condition so the test happens before anything is appended. Count the calls for an input of exactly two chunks: there should be three.
3. In `find_first`, decide which line ends the search early and which block handles "nothing found". Align the `else` with the `for`, and use the loop variables after a `break`.
4. Trace `find_first` with a match at index 2, with no match, and with an empty list, and check how many times the predicate runs in each case.
5. In `parse_pairs`, bind the parse result in the filter with a parenthesized `:=` and reuse that name in the output expression, then count the parser calls with a small wrapper function.
