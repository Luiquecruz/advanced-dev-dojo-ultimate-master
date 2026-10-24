`onClick={onClear()}` runs `onClear` during render and passes its return value as the handler. Pass the function itself: `onClick={onClear}`.
---
The first line of `handleSubmit` should be `event.preventDefault();`, otherwise the browser reloads the page.
---
`new FormData(event.currentTarget).get('query')` returns the input value. Wrap it in `String(...)`, call `.trim()`, and only call `onSearch(query)` when the result is not an empty string.
