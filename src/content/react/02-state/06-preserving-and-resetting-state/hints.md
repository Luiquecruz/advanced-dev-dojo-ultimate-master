`Chat` is always rendered at the same position with the same type, so React keeps its state and only updates the `contact` prop.
---
A `key` gives a component an identity. When the key changes, React unmounts the old instance and mounts a new one with fresh state.
---
Use the contact id as the key: `<Chat key={selected.id} contact={selected} />`. Clicking the same contact keeps the same key, so the draft survives.
