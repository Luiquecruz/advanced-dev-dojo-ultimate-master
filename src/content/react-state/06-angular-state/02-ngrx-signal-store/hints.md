`withState` takes the initial object: `withState<PreferencesState>({ theme: 'light', fontSize: 16 })`. Then each key is a signal: `store.theme()`.
---
Inside `withMethods((store) => ({ ... }))`, read the current value by calling the signal (`store.fontSize()`) or use an updater: `patchState(store, (state) => ({ fontSize: ... }))`.
---
Clamp with `Math.min(24, state.fontSize + 2)` and `Math.max(12, state.fontSize - 2)`. For `reset`, keep the initial object in a constant and call `patchState(store, initialState)`.
