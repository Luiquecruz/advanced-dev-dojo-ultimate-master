1. Write the `scored` handler: spread the state, add points to the matching team key and append a history entry.
2. Make `gameReset` return `initialState`.
3. Build `selectHome`, `selectAway` and `selectPlays` from `selectScoreboard`.
4. Compose `selectLeader` from the two score selectors so it is memoized on numbers, not on the whole state.
5. Replace the placeholder fields in `Scoreboard` with `store.selectSignal(...)` and dispatch the action creators in `score` and `reset`.
