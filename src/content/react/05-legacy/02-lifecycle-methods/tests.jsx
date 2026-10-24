test('shows "Loading..." and then the user name and email', async () => {
  const UserProfile = mod.default;
  render(<UserProfile userId={1} />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { level: 3 })).toHaveTextContent('Ada Lovelace');
  expect(screen.getByText('ada@example.com')).toBeInTheDocument();
});

test('fetches again when the userId prop changes', async () => {
  const UserProfile = mod.default;
  const { rerender } = render(<UserProfile userId={1} />);
  await screen.findByText('Ada Lovelace');
  rerender(<UserProfile userId={2} />);
  expect(await screen.findByText('Alan Turing')).toBeInTheDocument();
  expect(screen.getByText('alan@example.com')).toBeInTheDocument();
});

test('a slow stale response never replaces the newer user', async () => {
  const UserProfile = mod.default;
  mockApi('/users/1', async () => {
    await sleep(150);
    return { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' };
  });
  const { rerender } = render(<UserProfile userId={1} />);
  rerender(<UserProfile userId={2} />);
  await screen.findByText('Alan Turing');
  await act(() => sleep(250));
  expect(screen.queryByText('Ada Lovelace')).toBeNull();
  expect(screen.getByText('Alan Turing')).toBeInTheDocument();
});

test('aborts the in-flight request in componentWillUnmount', async () => {
  const UserProfile = mod.default;
  const handler = fn(() => ({ id: 3, name: 'Grace Hopper', email: 'grace@example.com' }));
  mockApi('/users/3', handler);
  const { unmount } = render(<UserProfile userId={3} />);
  unmount();
  await sleep(60);
  expect(handler).not.toHaveBeenCalled();
});

test('compares prevProps.userId inside componentDidUpdate', () => {
  expect(source).toMatch(/componentDidUpdate\s*\(\s*prevProps/);
  expect(source).toMatch(/prevProps\.userId/);
});
