1. Import `useId` and replace the random id: `useId()` produces identical ids on the server and during hydration.
2. Implement `renderApp` with `renderToString(<App initialCount={initialCount} />)`.
3. Replace `createRoot` with `hydrateRoot(container, <App initialCount={initialCount} />)` and return its result.
4. Pass the same `initialCount` to both sides: if the props differ, the first client render differs from the HTML and hydration mismatches.
5. Check the result: the server HTML is visible but inert until `hydrateApp` runs, then the same `<button>` node starts responding to clicks.
