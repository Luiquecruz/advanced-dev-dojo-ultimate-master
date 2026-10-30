1. Model the lifecycle first: `proposed → accepted → superseded`. Every function either moves a record one step forward or refuses.
2. In `accept`, reject anything that is not proposed, then return a spread copy with the new status. The starter mutates its argument, which would silently rewrite history held by other references.
3. In `supersede`, look up the old record, throw `not found` or `Cannot supersede` as needed, then accept the new proposal through `accept` so its own rules apply.
4. Produce the new log with `map` (untouched records keep their identity, the matching one becomes a superseded copy with `supersededBy`) and append the accepted replacement with `supersedes`.
5. Render Markdown from an array of lines: heading with id and title, then each section heading followed by its text. Derive the status line from the record instead of storing it.
6. Check the result against the tests: the original log is deep-equal to its snapshot after `supersede`, and a superseded record can be neither accepted nor superseded again.
