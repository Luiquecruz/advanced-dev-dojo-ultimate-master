1. Implement the two missing actions with `get()` for the guards and `set` for the changes; `set` only merges the keys you return, so `actions` is untouched.
2. Replace every whole-store read (`usePlayerStore()`) with a selector that returns exactly the hook's value. Each component then re-renders only when that value changes by `Object.is`.
3. Classify each selector: primitives and existing references are stable; a mapped array is new on every call and must be wrapped in `useShallow`.
4. Select `state.actions` for the actions hook: one stable object for every component that only triggers updates.
5. Check the reset path: because `actions` is part of the initial state, replacing the state with `getInitialState()` keeps working actions.
