`atom(read, write)` creates a writable derived atom. The read function receives `get`; the write function receives `get`, `set` and the value passed to the setter.
---
`fahrenheitAtom = atom((get) => (get(celsiusAtom) * 9) / 5 + 32, (get, set, fahrenheit) => set(celsiusAtom, ...))`. Only Celsius is stored; Fahrenheit is always computed.
---
For the reset action use `atom(null, (get, set) => set(celsiusAtom, 20))`, then in the button `const reset = useSetAtom(resetAtom);` and `onClick={reset}`. Finally wrap `App`'s children in `<Provider>`.
