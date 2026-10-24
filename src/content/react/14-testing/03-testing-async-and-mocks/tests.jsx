const serverError = () => new Response('Internal Server Error', { status: 500 });

const failOnce = () => {
  let calls = 0;
  mockApi('/api/users', () => {
    calls += 1;
    return calls === 1 ? serverError() : jsonResponse([{ id: 9, name: 'Barbara Liskov', email: 'barbara@example.com' }]);
  });
};

test('shows "Loading users..." and then one button per user', async () => {
  const { UserDirectory } = mod;
  render(<UserDirectory onSelect={fn()} />);
  expect(screen.getByText('Loading users...')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Ada Lovelace' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.queryByText('Loading users...')).toBeNull();
});

test('fetchUsers rejects with "Request failed: 500" on a server error', async () => {
  mockApi('/api/users', serverError);
  const error = await mod.fetchUsers().then(
    () => null,
    (reason) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe('Request failed: 500');
});

test('shows an alert instead of the loading text when the request fails', async () => {
  mockApi('/api/users', serverError);
  const { UserDirectory } = mod;
  render(<UserDirectory onSelect={fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load users.');
  expect(screen.queryByText('Loading users...')).toBeNull();
  expect(screen.queryByRole('list')).toBeNull();
});

test('Retry loads the users again after a failure', async () => {
  failOnce();
  const { UserDirectory } = mod;
  render(<UserDirectory onSelect={fn()} />);
  await user.click(await screen.findByRole('button', { name: 'Retry' }));
  expect(screen.getByText('Loading users...')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Barbara Liskov' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('clicking a user calls onSelect with the full user object', async () => {
  const { UserDirectory } = mod;
  const onSelect = fn();
  render(<UserDirectory onSelect={onSelect} />);
  await user.click(await screen.findByRole('button', { name: 'Grace Hopper' }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect.mock.calls[0][0]).toEqual({ id: 3, name: 'Grace Hopper', email: 'grace@example.com', role: 'viewer' });
});
