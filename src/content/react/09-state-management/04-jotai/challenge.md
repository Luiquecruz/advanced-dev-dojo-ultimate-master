Build a two-way temperature converter with **Jotai** atoms.

**`atoms.js`**

- `celsiusAtom`: primitive atom starting at `20` (already done).
- `fahrenheitAtom`: a **writable derived atom**.
  - read: `celsius * 9 / 5 + 32`
  - write `(get, set, fahrenheit)`: stores `(fahrenheit - 32) * 5 / 9` in `celsiusAtom`
- `resetAtom`: a **write-only** atom (read value `null`) that sets `celsiusAtom` back to `20`.

**`App.jsx`**

- `CelsiusInput` (done): a number input labelled `Celsius` bound to `celsiusAtom`.
- `FahrenheitInput`: a number input labelled `Fahrenheit` bound to `fahrenheitAtom` with `useAtom`. Typing in it updates the Celsius input.
- `ResetButton`: a `Reset` button that calls the setter returned by `useSetAtom(resetAtom)`.
- The default export `App` wraps the three components in a Jotai `<Provider>`, so two `App` instances keep independent temperatures.
