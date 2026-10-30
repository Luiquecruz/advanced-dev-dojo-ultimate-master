const sampleUsers = [
  { id: 10, name: 'Barbara Liskov', email: 'barbara@example.com', role: 'admin' },
  { id: 11, name: 'Edsger Dijkstra', email: 'edsger@example.com', role: 'viewer' },
];

function watchNetwork() {
  const networkHandler = fn(() => jsonResponse({ error: 'unexpected request' }, 500));
  mockApi(/.*/, networkHandler);
  return networkHandler;
}

function listedNames() {
  return within(screen.getByRole('list', { name: 'Users' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent.replace(/ \(.*$/, ''));
}

test('the directory still loads, lists and filters users', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByText('Loading users...')).toBeInTheDocument();
  await waitFor(() => expect(listedNames()).toHaveLength(5));
  await user.type(screen.getByLabelText('Filter users'), 'GR');
  expect(listedNames()).toEqual(['Grace Hopper']);
});

test('UserDirectory renders from props alone and reports typing through onQueryChange', async () => {
  const networkHandler = watchNetwork();
  const { UserDirectory } = modules['components/UserDirectory.jsx'];
  const onQueryChange = fn();
  render(<UserDirectory status="success" users={sampleUsers} query="e" onQueryChange={onQueryChange} />);
  expect(listedNames()).toEqual(['Barbara Liskov', 'Edsger Dijkstra']);
  expect(screen.getByLabelText('Filter users')).toHaveValue('e');
  await user.type(screen.getByLabelText('Filter users'), 'd');
  expect(onQueryChange).toHaveBeenLastCalledWith('ed');
  await sleep(20);
  expect(networkHandler).not.toHaveBeenCalled();
});

test('UserDirectory shows the loading and error states from the status prop', () => {
  const { UserDirectory } = modules['components/UserDirectory.jsx'];
  const { rerender } = render(<UserDirectory status="loading" users={[]} query="" onQueryChange={fn()} />);
  expect(screen.getByText('Loading users...')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Users' })).toBeNull();
  rerender(<UserDirectory status="error" users={[]} query="" onQueryChange={fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load users');
});

test('useUserDirectory fetches users and filters them by query', async () => {
  const { useUserDirectory } = modules['hooks/useUserDirectory.js'];
  const { result } = renderHook(() => useUserDirectory());
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('success'));
  expect(result.current.users).toHaveLength(5);
  act(() => result.current.setQuery('  ada '));
  expect(result.current.query).toBe('  ada ');
  expect(result.current.users.map((entry) => entry.name)).toEqual(['Ada Lovelace']);
});

test('useUserDirectory reports a failed request as status "error"', async () => {
  mockApi('/api/users', () => jsonResponse({ error: 'Down' }, 500));
  const { useUserDirectory } = modules['hooks/useUserDirectory.js'];
  const { result } = renderHook(() => useUserDirectory());
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.users).toEqual([]);
});

test('App only composes the hook and the view, and the view holds no state or fetching', () => {
  expect(source).not.toMatch(/\bclass\s+\w+|extends\s+Component/);
  expect(source).not.toMatch(/\bfetch\s*\(/);
  expect(source).toMatch(/useUserDirectory\s*\(/);
  expect(source).toMatch(/<UserDirectory\b/);
  expect(sources['components/UserDirectory.jsx']).not.toMatch(/\bfetch\s*\(|useEffect|useState/);
});
