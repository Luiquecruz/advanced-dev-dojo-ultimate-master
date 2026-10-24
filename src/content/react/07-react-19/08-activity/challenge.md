Build `MailTabs`, the default export, with two tabs that keep their state using `<Activity>`.

The starter already contains:

- `ComposePanel`: a `<textarea>` labelled `Message` with local state.
- `HistoryPanel`: renders `<h2>History</h2>` and, in an effect, pushes `'connect'` to the exported `connectionLog` array on mount and `'disconnect'` on cleanup.

Your task in `MailTabs`:

1. Keep the active tab in state, starting with `'compose'`.
2. Render two buttons, `Compose` and `History`, that switch the active tab.
3. Render **both** panels, each wrapped in `<Activity>`. The active panel uses `mode="visible"`, the other `mode="hidden"`.

Expected behavior:

- Text typed in the message survives switching to History and back.
- The hidden panel stays in the DOM but is not displayed.
- `HistoryPanel` only connects while visible: it does not connect on load, connects when shown and disconnects when hidden again.
