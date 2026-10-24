`import { produce } from 'immer';` then `export const boardReducer = produce((draft, action) => { switch (action.type) { ... } });`. Inside, write plain mutations on `draft`; do not return anything.
---
Write a helper `findCard(draft, cardId)` that loops over `draft.columns` and returns `{ column, card }` (or `null`). All four cases become a few lines with it.
---
Moving: `found.column.cards.splice(found.column.cards.indexOf(found.card), 1); target.cards.push(found.card);`. Guard with `if (!found || !target || found.column === target) break;` so a no-op returns the original state.
---
Form: `const [draft, updateDraft] = useImmer({ title: '', columnId: 'todo' });` and `updateDraft((current) => { current.title = event.target.value; })`.
