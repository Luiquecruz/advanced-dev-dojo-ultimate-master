1. Separate the two kinds of input. Values (an email, a limit) travel as parameters; identifiers (table, column) and keywords (`ASC`) cannot, so they must be validated against a whitelist or a strict pattern.
2. Write `sql` first: the template parts and the interpolated values alternate, so numbering is just the position of each value.
3. Write `assertIdentifier` with one anchored regular expression (`^...$`), so nothing can hide before or after a valid name.
4. In `buildSelect`, collect values in an array and let the push order produce the placeholder numbers; the text and the values can never drift apart.
5. Append clauses in SQL order (`WHERE`, `ORDER BY`, `LIMIT`, `OFFSET`), treating `null` and arrays specially because `= NULL` never matches and a list is one array parameter in Postgres.
6. Check every identifier before it touches the text, and reject any sort direction other than the two literal keywords.
