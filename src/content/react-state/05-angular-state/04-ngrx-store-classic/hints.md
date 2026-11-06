Reducer handlers receive the state and the action: `on(scored, (state, { team, points }) => ({ ...state, ... }))`. A computed key `[team]: state[team] + points` updates the right side.
---
Do not `push` into `history`: return `history: [...state.history, { team, points }]`.
---
Selectors compose: `createSelector(selectHome, selectAway, (home, away) => home > away ? 'Home' : away > home ? 'Away' : 'Tied')`.
---
In the component: `protected readonly home = this.store.selectSignal(selectHome);` and `this.store.dispatch(scored({ team, points }));`.
