Store one record per path in a `Map`: the HTML, the time it was generated (`now()`) and a `stale` flag. A page is fresh when it is not flagged and `now() - generatedAt < revalidateSeconds * 1000`.
---
For a stale page, call the regeneration **without** `await` and return the old HTML right away. The regeneration renders, then overwrites the record with the new HTML and a new `generatedAt`.
---
Deduplicate with a second `Map` of in-flight regenerations: skip when the path is already there, add the promise when you start, and delete it in `finally`. Attach a `.catch(() => {})` so a failed render only leaves the old record in place.
