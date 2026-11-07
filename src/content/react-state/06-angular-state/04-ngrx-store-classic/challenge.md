Finish a basketball scoreboard built with the classic NgRx Store. The actions are already defined in `scoreboard.actions.ts`: `scored({ team, points })` and `gameReset()`.

**`scoreboard.reducer.ts`**: complete `scoreboardReducer` (state `{ home, away, history }`):

1. `on(scored)` adds `points` to `home` or `away` and appends `{ team, points }` to `history`, returning a **new** state object.
2. `on(gameReset)` returns `initialState`.

**`scoreboard.selectors.ts`**: using `createSelector` on `selectScoreboard`, export:

3. `selectHome` and `selectAway`.
4. `selectLeader`, composed from `selectHome` and `selectAway`, returning `'Home'`, `'Away'` or `'Tied'`.
5. `selectPlays`: the number of entries in `history`.

**`app.ts`**: in `Scoreboard`, read `home`, `away`, `leader` and `plays` with `this.store.selectSignal(...)`, make `score(team, points)` dispatch `scored(...)` and `reset()` dispatch `gameReset()`. The template is already written.
