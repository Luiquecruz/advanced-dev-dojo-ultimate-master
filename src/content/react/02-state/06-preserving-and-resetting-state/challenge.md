In this messenger, a draft typed for one contact stays in the text area after switching to another contact. Fix it so **each contact switch starts with an empty draft**.

The starter already contains:

- `export const contacts`: Ada Lovelace (`id: 1`), Alan Turing (`id: 2`), Grace Hopper (`id: 3`).
- `export function Chat({ contact })`: keeps a `draft` state in a `<textarea>` labelled `Message to <name>`.
- The default export `Messenger`: a `<nav>` with one button per contact name and the `Chat` for the selected contact (Ada first).

Requirements:

1. Switching to a different contact shows an empty draft. Switching back also shows an empty draft.
2. Clicking the contact that is already selected keeps the current draft.
3. Use a **`key`** to reset `Chat`. Do not clear the draft with `useEffect`.
