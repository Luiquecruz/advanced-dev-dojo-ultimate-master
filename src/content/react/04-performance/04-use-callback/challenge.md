**Fix the bug.** `TodoItem` is already wrapped in `memo`, yet every keystroke in the draft input re-renders all three items. The culprit: `handleToggle` and `handleDelete` are new functions on every render of `TodoList`.

Make the handlers stable:

- Wrap `handleToggle` and `handleDelete` in `useCallback`.
- Use **functional updates** (`setTodos((current) => ...)`) so the callbacks do not need `todos` as a dependency. Their dependency arrays can then be empty.
- Typing in the `New todo` input must not re-render any `TodoItem`.
- Toggling a checkbox must re-render **only** that item (the tests count renders through the `onItemRender` prop, which receives the todo id).
- Toggle (checkbox labelled with the title) and delete (`Delete {title}` button) must keep working.

Do not change `TodoItem`.
