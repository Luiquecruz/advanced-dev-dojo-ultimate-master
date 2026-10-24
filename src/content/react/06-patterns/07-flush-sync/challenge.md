The `TodoList` below has a bug: after adding a todo, it tries to focus the new item, but the **previous** item gets focus instead, because the DOM is not updated yet when the handler reads it.

Fix it with **`flushSync`** from `react-dom` (keep the imperative focus code).

Requirements:

- An `<input aria-label="New todo">` and a `<button>` **`Add`**.
- Clicking `Add` appends the trimmed text to the list as a `<li tabIndex={-1}>` and clears the input. Empty or whitespace-only text adds nothing.
- Right after adding, the **new** `<li>` must have focus.
- The list starts with `Learn JSX` and `Master hooks`.
