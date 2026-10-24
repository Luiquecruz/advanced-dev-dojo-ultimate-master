const useFetch = () => modules['useFetch.js'].useFetch;

test('useFetch starts loading and then returns the parsed JSON', async () => {
  const hook = useFetch();
  const { result } = renderHook(() => hook('/api/users'));
  expect(result.current.isLoading).toBe(true);
  expect(result.current.data).toBeNull();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data).toHaveLength(5);
  expect(result.current.error).toBeNull();
});

test('useFetch turns a non-OK response into an error', async () => {
  const hook = useFetch();
  const { result } = renderHook(() => hook('/api/error'));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data).toBeNull();
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.error.message).toBe('Request failed with status 500');
});

test('useFetch refetches when the url changes and ignores stale responses', async () => {
  mockApi('/users/1', async () => {
    await sleep(150);
    return { id: 1, name: 'Ada Lovelace' };
  });
  const hook = useFetch();
  const { result, rerender } = renderHook(({ url }) => hook(url), { initialProps: { url: '/api/users/1' } });
  rerender({ url: '/api/users/2' });
  await waitFor(() => expect(result.current.data?.name).toBe('Alan Turing'));
  await act(() => sleep(250));
  expect(result.current.data.name).toBe('Alan Turing');
});

test('UserList shows "Loading users..." and then one <li> per user', async () => {
  const UserList = mod.UserList;
  render(<UserList />);
  expect(screen.getByText('Loading users...')).toBeInTheDocument();
  await screen.findByText('Grace Hopper');
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
});

test('UserList shows the error message in an alert when the API fails', async () => {
  mockApi('/api/users', () => jsonResponse({ error: 'Boom' }, 503));
  const UserList = mod.UserList;
  render(<UserList />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Request failed with status 503');
});
