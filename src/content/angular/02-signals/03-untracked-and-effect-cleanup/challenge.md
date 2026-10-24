Complete the `AutoSave` component in `app.ts` (selector `app-auto-save`). It has a `draft` signal bound to an input, an `author` signal, a `saved` list and `delayMs = 150`.

In the constructor, create an **effect** that auto-saves the draft with a debounce:

1. Read `draft()` (tracked). If it's empty, do nothing.
2. Read the author with `untracked(...)`, so changing only the author never triggers a save.
3. Start a `setTimeout` of `delayMs` that appends `` `${author}: ${draft}` `` (e.g. `Ada: Hello`) to `saved`.
4. Register a cleanup with `onCleanup` that clears that timeout. This debounces typing (each keystroke cancels the previous pending save) and cancels the pending save when the component is destroyed.

Saved entries are rendered as `<li>` items.
