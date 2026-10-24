const users = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
];

const items = () => screen.getAllByRole('listitem').map((item) => item.textContent.trim());

test('renders a numbered <li> per user with *ngFor and its index', async () => {
  await render(mod.UserListComponent, { inputs: { users } });
  expect(items()).toEqual(['1. Ada Lovelace', '2. Alan Turing', '3. Grace Hopper']);
});

test('shows the #empty template through the *ngIf else clause when there are no users', async () => {
  const { setInput } = await render(mod.UserListComponent, { inputs: { users: [] } });
  expect(screen.getByText('No users found')).toBeInTheDocument();
  expect(screen.queryByRole('list')).toBeNull();
  await setInput('users', users);
  expect(screen.queryByText('No users found')).toBeNull();
  expect(screen.getByRole('list')).toBeInTheDocument();
});

test('clicking a user shows "Selected: <name>"', async () => {
  await render(mod.UserListComponent, { inputs: { users } });
  expect(screen.queryByText(/Selected:/)).toBeNull();
  await user.click(screen.getByText('2. Alan Turing'));
  await stable();
  expect(screen.getByText('Selected: Alan Turing')).toBeInTheDocument();
});

test('trackBy keeps DOM nodes when the array is replaced with equal ids', async () => {
  const { setInput } = await render(mod.UserListComponent, { inputs: { users } });
  const before = screen.getAllByRole('listitem');
  await setInput('users', users.map((current) => ({ ...current })));
  const after = screen.getAllByRole('listitem');
  expect(after[0]).toBe(before[0]);
  expect(after[2]).toBe(before[2]);
});

test('uses *ngIf with else, *ngIf with as, *ngFor with trackBy (no @if/@for)', () => {
  expect(source).toMatch(/\*ngIf="[^"]*;\s*else\s+empty"/);
  expect(source).toMatch(/\*ngIf="\s*selected\s+as\s+user\s*"/);
  expect(source).toMatch(/\*ngFor="let user of users;[^"]*trackBy:\s*trackById/);
  expect(source).not.toMatch(/@(if|for)\s*\(/);
});
