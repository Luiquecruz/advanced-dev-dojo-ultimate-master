1. Reproduce the bug: add a todo and notice that the previously last item is focused.
2. Understand why: React batches the setters and re-renders after the handler, so the DOM is stale inside it.
3. Wrap both setters in `flushSync(() => { ... })` so React renders and commits synchronously.
4. Keep the imperative `focus()` call after `flushSync`: the new `<li>` is now the last child.
5. Consider the trade-off: this event needs the DOM immediately, so the escape hatch is justified here.
