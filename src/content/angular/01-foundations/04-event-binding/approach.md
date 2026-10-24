1. Add `(input)="updateDraft($event)"` to the `<input>` and implement `updateDraft` by casting `event.target` to `HTMLInputElement`.
2. Implement `send()`: read and trim `draft()`, stop when empty, append to `messages` immutably with `update`, then reset `draft`.
3. Bind `(click)="send()"` on the button and `(keydown.enter)="send()"` on the input.
4. Implement `clear()` and bind it with `(keydown.escape)`.
5. Because the input's `[value]` is bound to `draft()`, resetting the signal also empties the field.
