`set` accepts a function from state to the next state, and `produce(recipe)` returns exactly that: `set(produce((draft) => { ... }), false, 'recent/viewProduct')`. Inside: remove the existing index with `splice`, `unshift(id)`, then `draft.recentIds.splice(5)` trims the rest.
---
Middleware nest like function calls: `createStore(devtools(persist((...args) => ({ ...slices }), persistOptions), { name: 'shop' }))`. Import `devtools` and `persist` from `zustand/middleware`.
---
`partialize: (state) => ({ theme: state.theme, density: state.density, recentIds: state.recentIds })`. In `migrate`, when `version < 2`: `const { darkMode, ...rest } = persisted; return { ...rest, theme: darkMode ? 'dark' : 'light' };`.
---
Provider: `const [store] = useState(createAppStore); return <AppStoreContext value={store}>{children}</AppStoreContext>;`. Hook: `const store = use(AppStoreContext); if (store === null) throw new Error('useAppStore must be used within an AppStoreProvider'); return useStore(store, selector);`.
