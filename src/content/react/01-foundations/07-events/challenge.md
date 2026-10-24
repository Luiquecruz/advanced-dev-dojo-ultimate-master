Fix and finish the `SearchForm` component. It receives two props: `onSearch(query)` and `onClear()`.

1. Render a `<form role="search">` containing:
   - `<input name="query" aria-label="Search" />`
   - `<button type="submit">Search</button>`
   - `<button type="button">Clear</button>`
2. On submit, **prevent the page reload**, read the `query` field (use `FormData`), trim it and call `onSearch` with the trimmed text. If the trimmed text is empty, do **not** call `onSearch`.
3. Clicking **Clear** calls `onClear` once. The starter calls it during render: fix that bug. Clear must not submit the form.
