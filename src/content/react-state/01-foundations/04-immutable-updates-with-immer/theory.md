## Why immutability is not optional

React, `memo`, `useMemo`, selectors in Zustand and Redux, and DevTools time travel all decide "did this change?" with **reference equality** (`Object.is`). If you mutate an object in place, its reference stays the same, so:

- `setState(sameObject)` bails out and nothing renders;
- `memo` children and selectors think nothing changed;
- the previous state you kept for undo silently changes too.

Immutable updates create new objects **only along the path that changed** and reuse everything else. That reuse is called **structural sharing**, and it is what makes cheap `===` checks reliable.

## Spread hell

Updating one tag of one card in a kanban board by hand:

```js
const next = {
  ...board,
  columns: board.columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) =>
      card.id === cardId ? { ...card, tags: [...card.tags, tag] } : card,
    ),
  })),
};
```

It is long, and it has a subtle bug: every column gets a new object even when none of its cards changed, so every memoized column re-renders. Getting both correctness and sharing right by hand is tedious.

## Immer: write mutations, get immutable results

`produce(base, recipe)` gives the recipe a **draft** (a Proxy). You mutate the draft; Immer records the changes and builds a new state with structural sharing. Untouched branches keep their references.

```js
import { produce } from 'immer';

const next = produce(board, (draft) => {
  const card = draft.columns[0].cards.find((entry) => entry.id === cardId);
  card.tags.push(tag);
});

next === board;
next.columns[1] === board.columns[1];
```

The first comparison is `false` (something changed), the second `true` (column 1 was not touched). If the recipe changes nothing, `produce` returns the **base object itself**, so React bails out for free.

Immer also **auto-freezes** results in development and production, so an accidental mutation later throws instead of corrupting state.

### Curried producers make reducers

Passing only the recipe returns a function `(state, ...args) => nextState`, which is exactly a reducer:

```js
export const boardReducer = produce((draft, action) => {
  switch (action.type) {
    case 'cardRenamed': {
      const card = findCard(draft, action.cardId);
      if (card) card.title = action.title;
      break;
    }
  }
});

const [board, dispatch] = useReducer(boardReducer, initialBoard);
```

## use-immer

The `use-immer` package wraps the same idea in hooks:

```jsx
import { useImmer, useImmerReducer } from 'use-immer';

const [draft, updateDraft] = useImmer({ title: '', columnId: 'todo' });
updateDraft((current) => {
  current.title = 'New card';
});
```

`updateDraft` also accepts a plain value, like `setState`. `useImmerReducer(recipe, initialState)` takes a recipe that mutates the draft instead of returning a new state.

## Rules and pitfalls

- **Mutate the draft or return a new value, never both.** Returning `draft.items.filter(...)` replaces the whole state with an array.
- **Do not reassign the draft** (`draft = {...}` does nothing). Assign properties instead, or return a new object.
- **Drafts are revoked** when the recipe ends. Do not store them in variables outside, call `setTimeout` with them, or log them later; use `current(draft)` to take a plain snapshot.
- **Moving objects is fine**: removing a card from one array and pushing it into another moves the draft.
- `Map` and `Set` need `enableMapSet()` once at startup.
- Keep side effects (ids, dates) outside: pass them in the action.

Redux Toolkit's `createSlice` and Zustand's `immer` middleware use the same library, so these rules apply there too.

## When to use it / when not to

Use Immer when updates reach two or more levels deep (boards, trees, nested forms, normalized data), when many reducers touch nested structures, or when structural sharing matters for memoized children. Skip it for flat state (`setCount(c => c + 1)`, toggles, replacing a whole list) where spreads are already clear, and in very hot loops over huge collections where proxy overhead is measurable. Immer does not replace good state shape: deeply nested data is often better normalized (by id) first.
