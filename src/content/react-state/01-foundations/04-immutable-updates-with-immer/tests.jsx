const deepFreeze = (value) => {
  Object.values(value).forEach((child) => child && typeof child === 'object' && deepFreeze(child));
  return Object.freeze(value);
};

const frozenBoard = () => deepFreeze(structuredClone(mod.initialBoard));
const titles = (board, columnId) => board.columns.find((column) => column.id === columnId).cards.map((card) => card.title);

test('cardMoved moves the card to the end of the target column without mutating the input', () => {
  const board = frozenBoard();
  const next = mod.boardReducer(board, { type: 'cardMoved', cardId: 'c1', toColumnId: 'done' });
  expect(titles(next, 'todo')).toEqual(['Design API']);
  expect(titles(next, 'done')).toEqual(['Write specs']);
  expect(titles(board, 'todo')).toEqual(['Write specs', 'Design API']);
});

test('untouched columns and cards keep their references (structural sharing)', () => {
  const board = frozenBoard();
  const renamed = mod.boardReducer(board, { type: 'cardRenamed', cardId: 'c3', title: 'Build sign-in' });
  expect(titles(renamed, 'doing')).toEqual(['Build sign-in']);
  expect(renamed.columns[0]).toBe(board.columns[0]);
  expect(renamed.columns[2]).toBe(board.columns[2]);
  const moved = mod.boardReducer(board, { type: 'cardMoved', cardId: 'c1', toColumnId: 'done' });
  expect(moved.columns[1]).toBe(board.columns[1]);
  expect(moved.columns[0].cards[0]).toBe(board.columns[0].cards[1]);
});

test('tagToggled adds a missing tag and removes an existing one in the nested array', () => {
  const board = frozenBoard();
  const added = mod.boardReducer(board, { type: 'tagToggled', cardId: 'c2', tag: 'backend' });
  expect(added.columns[0].cards[1].tags).toEqual(['backend']);
  const removed = mod.boardReducer(added, { type: 'tagToggled', cardId: 'c1', tag: 'docs' });
  expect(removed.columns[0].cards[0].tags).toEqual([]);
  expect(removed.columns[0].cards[1]).toBe(added.columns[0].cards[1]);
  expect(board.columns[0].cards[1].tags).toEqual([]);
});

test('updates that change nothing return the same state, and results are frozen by Immer', () => {
  const board = frozenBoard();
  expect(mod.boardReducer(board, { type: 'cardRenamed', cardId: 'missing', title: 'x' })).toBe(board);
  expect(mod.boardReducer(board, { type: 'cardMoved', cardId: 'c3', toColumnId: 'doing' })).toBe(board);
  const next = mod.boardReducer(structuredClone(mod.initialBoard), { type: 'cardAdded', columnId: 'done', id: 'c9', title: 'Release' });
  expect(titles(next, 'done')).toEqual(['Release']);
  expect(Object.isFrozen(next.columns[2].cards)).toBe(true);
});

test('the board adds cards with the form and moves them with the select', async () => {
  const App = mod.default;
  render(<App />);
  await user.type(screen.getByLabelText('Card title'), 'Write tests');
  await user.selectOptions(screen.getByLabelText('Column'), 'doing');
  await user.click(screen.getByRole('button', { name: 'Add card' }));
  expect(within(screen.getByRole('region', { name: 'Doing' })).getByText('Write tests')).toBeInTheDocument();
  expect(screen.getByLabelText('Card title')).toHaveValue('');
  await user.selectOptions(screen.getByLabelText('Move Write specs'), 'done');
  expect(within(screen.getByRole('region', { name: 'Done' })).getByText('Write specs')).toBeInTheDocument();
});

test('uses produce from immer for the reducer and useImmer for the form draft', () => {
  expect(source).toMatch(/produce\s*\(/);
  expect(source).toMatch(/useImmer\s*\(/);
  expect(source).not.toMatch(/\.\.\.\s*(board|column|card)\b/);
});
