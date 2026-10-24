Setters only queue updates. When `listRef.current.lastElementChild.focus()` runs, React has not rendered the new `<li>` yet, so the old last item is focused.
---
`flushSync(callback)` runs the callback and commits the resulting updates to the DOM before returning. Put the setters inside it.
---
`flushSync(() => { setTodos([...todos, title]); setText(''); });` and keep the `focus()` call after it.
