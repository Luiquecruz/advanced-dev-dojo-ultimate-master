1. Keep a single source of truth: only `celsiusAtom` stores a value.
2. Make `fahrenheitAtom` a derived atom whose read function converts Celsius to Fahrenheit; the UI reading it updates whenever Celsius changes.
3. Give it a write function that converts the incoming Fahrenheit back and calls `set(celsiusAtom, ...)`; now both inputs can edit the same state.
4. Create `resetAtom` with `null` as its read value: it exists only to perform an action.
5. Use `useAtom(fahrenheitAtom)` in `FahrenheitInput`, and `useSetAtom(resetAtom)` in `ResetButton` so the button never re-renders on temperature changes.
6. Wrap the components in `<Provider>` so each `App` gets its own store instead of sharing the global default store.
