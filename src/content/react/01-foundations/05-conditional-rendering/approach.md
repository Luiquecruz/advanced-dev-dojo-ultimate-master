1. Add an early return for the logged-out case before any other JSX.
2. Store `messages.length` in a `count` variable to keep the JSX readable.
3. Replace `messages.length && <span ...>` with `count > 0 && <span ...>` so a zero count renders nothing.
4. Use a ternary for the paragraph: the empty message for `0`, otherwise the sentence with a nested ternary for `message` / `messages`.
