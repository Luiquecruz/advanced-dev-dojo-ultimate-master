1. Define a `PreferencesState` type and an `initialState` constant.
2. Call `signalStore({ providedIn: 'root' }, withState(initialState), withMethods(...))`.
3. In `withMethods`, write each method with `patchState`, using updater functions where the new value depends on the old one.
4. Clamp the font size with `Math.min`/`Math.max`.
5. In the component, `inject(PreferencesStore)` and bind the paragraphs and buttons to its signals and methods.
