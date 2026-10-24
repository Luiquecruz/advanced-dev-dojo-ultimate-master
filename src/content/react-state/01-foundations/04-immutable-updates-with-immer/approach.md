1. Identify the bugs before rewriting: `splice` and `push` on the current state are mutations, and `cardRenamed` creates a new object for every column even when nothing in it changed.
2. Replace the function with `produce(recipe)`. The curried form returns `(state, action) => nextState`, so `useReducer` keeps working unchanged.
3. Factor the lookup into `findCard`, which returns the draft column and card. Every case mutates those drafts directly.
4. Make no-op updates truly no-op: when the card or column is missing, or the card is already in the target column, `break` without touching the draft. Immer then returns the original object.
5. Immer handles structural sharing and freezing: only the drafts you touched are copied.
6. Convert the form draft to `useImmer` and update its fields with recipe functions.
