1. Write the log format as four named pieces, each with the narrowest character class that fits: ASCII digits for the timestamp, an alternation for the level, "anything but `]`" for the service, the rest for the message.
2. Decide which method answers the question. "Does this whole line have the format?" is `fullmatch`; `match` and `search` answer different questions.
3. Run the rejected fixtures one by one (leading text, trailing newline, wrong level, no brackets, empty message) and check that each one fails for the reason you expect.
4. For each quantifier, ask what happens on 50,000 characters that almost match: who stops it, and how many start positions `search` or `sub` will try? Bound what can be bounded.
5. Build the email replacement with a function that reads groups from the `Match`, so the replacement depends on the address.
6. Check the ids against the lookalikes: a longer number, a prefix glued to another word, and digits from another script.
