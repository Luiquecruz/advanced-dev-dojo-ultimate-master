const USERS = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com' },
];

test('renders every user with their email', () => {
  const Dashboard = mod.default;
  render(<Dashboard users={USERS} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('(ada@example.com)', { exact: false })).toBeInTheDocument();
});

test('UserList is exported wrapped in memo()', () => {
  expect(mod.UserList.$$typeof).toBe(Symbol.for('react.memo'));
});

test('clicking the counter does NOT re-render UserList', async () => {
  const Dashboard = mod.default;
  const onListRender = fn();
  render(<Dashboard users={USERS} onListRender={onListRender} />);
  expect(onListRender).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Clicks: 0' }));
  await user.click(screen.getByRole('button', { name: 'Clicks: 1' }));
  expect(screen.getByRole('button')).toHaveTextContent('Clicks: 2');
  expect(onListRender).toHaveBeenCalledTimes(1);
});

test('a new users array still re-renders UserList', () => {
  const Dashboard = mod.default;
  const onListRender = fn();
  const { rerender } = render(<Dashboard users={USERS} onListRender={onListRender} />);
  rerender(<Dashboard users={[...USERS, { id: 3, name: 'Grace Hopper', email: 'grace@example.com' }]} onListRender={onListRender} />);
  expect(onListRender).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Grace Hopper', { exact: false })).toBeInTheDocument();
});
