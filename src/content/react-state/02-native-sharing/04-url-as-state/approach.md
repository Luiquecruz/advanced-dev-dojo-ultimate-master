1. Decide the owner: filters define what is on screen and must survive reloads and back/forward, so the URL owns them and React only reads it.
2. Write `parseFilters` as the single gate between untrusted strings and typed filters, with defaults for anything missing or unknown.
3. Replace the local state with `useSearchParams` and derive the filters on every render; the list is derived from them as before.
4. Implement one `updateFilter` with the functional setter so updating one key keeps the others, and delete default values to keep URLs canonical.
5. Choose the history mode per interaction: discrete choices push, typing replaces.
6. Clearing is just an empty set of params.
