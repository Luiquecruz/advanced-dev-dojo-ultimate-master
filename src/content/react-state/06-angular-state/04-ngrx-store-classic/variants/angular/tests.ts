const actions = () => modules['scoreboard.actions.ts'];
const reducerFile = () => modules['scoreboard.reducer.ts'];
const selectors = () => modules['scoreboard.selectors.ts'];
const { provideStore } = require('@ngrx/store');

test('the reducer adds points, records history and never mutates the previous state', () => {
  const { scoreboardReducer, initialState } = reducerFile();
  const { scored } = actions();
  const first = scoreboardReducer(undefined, { type: '@@unknown' });
  expect(first).toEqual({ home: 0, away: 0, history: [] });
  const second = scoreboardReducer(first, scored({ team: 'home', points: 3 }));
  const third = scoreboardReducer(second, scored({ team: 'away', points: 1 }));
  expect(third).toEqual({ home: 3, away: 1, history: [{ team: 'home', points: 3 }, { team: 'away', points: 1 }] });
  expect(first).toEqual({ home: 0, away: 0, history: [] });
  expect(second.history).toHaveLength(1);
  expect(initialState.history).toHaveLength(0);
});

test('gameReset brings the initial state back', () => {
  const { scoreboardReducer } = reducerFile();
  const { scored, gameReset } = actions();
  const played = scoreboardReducer(undefined, scored({ team: 'away', points: 3 }));
  expect(scoreboardReducer(played, gameReset())).toEqual({ home: 0, away: 0, history: [] });
});

test('selectors read the feature state and derive the leader', () => {
  const { selectHome, selectAway, selectLeader, selectPlays } = selectors();
  const state = { scoreboard: { home: 4, away: 6, history: [{}, {}, {}] } };
  expect(selectHome(state)).toBe(4);
  expect(selectAway(state)).toBe(6);
  expect(selectLeader(state)).toBe('Away');
  expect(selectPlays(state)).toBe(3);
  expect(selectLeader.projector(2, 1)).toBe('Home');
  expect(selectLeader.projector(5, 5)).toBe('Tied');
});

test('Scoreboard dispatches actions and renders the selected state', async () => {
  const { scoreboardReducer } = reducerFile();
  await render(mod.Scoreboard, { providers: [provideStore({ scoreboard: scoreboardReducer })] });
  expect(screen.getByText('Home 0 - 0 Away')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Home +3' }));
  await user.click(screen.getByRole('button', { name: 'Away +1' }));
  await stable();
  expect(screen.getByText('Home 3 - 1 Away')).toBeInTheDocument();
  expect(screen.getByText('Leader: Home')).toBeInTheDocument();
  expect(screen.getByText('Plays: 2')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  await stable();
  expect(screen.getByText('Home 0 - 0 Away')).toBeInTheDocument();
  expect(screen.getByText('Leader: Tied')).toBeInTheDocument();
});

test('the component talks to the Store only through dispatch and selectors', () => {
  expect(source).toMatch(/\.dispatch\(\s*scored\(/);
  expect(source).toMatch(/\.dispatch\(\s*gameReset\(\s*\)/);
  expect(source).toMatch(/selectSignal\(\s*selectLeader\s*\)/);
});
