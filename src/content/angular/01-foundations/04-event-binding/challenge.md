Build a small chat composer: the `ChatComposer` component in `app.ts` (selector `app-chat-composer`). The template and the `draft` / `messages` signals are already there; wire up the events.

1. **Input**: on every `(input)` event, call `updateDraft($event)`, which stores the input's current value in `draft`.
2. The `<p class="count">` already shows `draft().length` + `/140`; it must update while typing.
3. **Send**: implement `send()`. If `draft()` trimmed is not empty, append the trimmed text to `messages` and reset `draft` to `''`. Whitespace-only drafts are ignored.
4. Call `send()` when the **Send** button is clicked and when **Enter** is pressed in the input (use `(keydown.enter)`).
5. Implement `clear()` that resets `draft` to `''`, and call it when **Escape** is pressed in the input (`(keydown.escape)`).

Each message is rendered as an `<li>` inside the list (already done for you).
