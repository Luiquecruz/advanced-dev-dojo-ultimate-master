The kanban board's `boardReducer` is written with nested spreads. It mutates the state in two places (`cardMoved` and `tagToggled`) and breaks structural sharing in `cardRenamed`. Rewrite it with **Immer**.

**`boardReducer`** (named export): replace the function with a **curried producer**: `export const boardReducer = produce((draft, action) => { ... })`. State shape: `{ columns: [{ id, title, cards: [{ id, title, tags: [] }] }] }`.

| Action | Effect |
| --- | --- |
| `{ type: 'cardAdded', columnId, id, title }` | push `{ id, title, tags: [] }` to that column |
| `{ type: 'cardMoved', cardId, toColumnId }` | remove the card from its column and push it to the end of the target column; do nothing if it is already there |
| `{ type: 'cardRenamed', cardId, title }` | change that card's title |
| `{ type: 'tagToggled', cardId, tag }` | add `tag` to the card's `tags`, or remove it if present |

Requirements checked by the tests:

- The input state is never mutated (tests pass deep-frozen boards).
- Untouched columns and cards keep **the same references**.
- Updates that change nothing (unknown card, moving to the same column) return **the same state object**.
- **`NewCardForm`**: replace `useState` + spreads with **`useImmer`** from `use-immer`. Keep the `Card title` input, the `Column` select and the `Add card` button; the title clears after adding.
- Do not spread `board`, `column` or `card` anywhere.
