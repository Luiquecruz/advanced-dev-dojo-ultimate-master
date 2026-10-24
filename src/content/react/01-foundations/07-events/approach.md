1. Change the Clear button to `onClick={onClear}` so React calls it on click instead of during render.
2. In `handleSubmit`, call `event.preventDefault()` first.
3. Build `new FormData(event.currentTarget)` (the form the handler is attached to) and read `get('query')`.
4. Trim the value and guard with `if (query)` before calling `onSearch(query)`.
5. Keep `type="button"` on Clear so clicking it never triggers a submit.
