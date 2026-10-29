1. Encode every input rule in the schema: defaults, the clamp, the sort whitelist. The handler then works with trusted, typed values and the `400` comes for free from the validator hook.
2. Build the offset list as a pipeline: filter, count `total` on the filtered list, sort a copy with a deterministic comparator (tie-break on `id`), then slice with `offset` and `limit`.
3. Write the cursor helpers as a pair and treat every decoding failure (bad base64, bad JSON, missing or non-numeric `id`) as `null`.
4. In the feed, translate the cursor into a condition on the sort key (`id > after`) instead of an offset. This is what keeps the next page correct after deletions.
5. Decide whether a next page exists by looking at what remains after the page, and return `null` at the end so clients know when to stop.
6. Walk the whole feed mentally with `limit=10` over 25 products: 10, 10, 5, then `null`.
