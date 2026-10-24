1. Notice that `Chat` keeps its position and type when the contact changes, which is why React preserves `draft`.
2. Add `key={selected.id}` to the `<Chat />` element in `Messenger`.
3. A new id means a new `Chat` instance: the old draft is discarded, and coming back to a contact creates yet another fresh instance.
4. Selecting the same contact keeps the same key, so nothing resets. No effect is required.
