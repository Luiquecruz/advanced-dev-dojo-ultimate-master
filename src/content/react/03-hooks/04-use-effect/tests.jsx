test('shows "Loading..." while the request is pending', () => {
  const UserCard = mod.default;
  render(<UserCard userId={1} />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('renders the user name in an <h3> after loading', async () => {
  const UserCard = mod.default;
  render(<UserCard userId={1} />);
  const heading = await screen.findByRole('heading', { level: 3 });
  expect(heading).toHaveTextContent('Ada Lovelace');
});

test('fetches again when userId changes', async () => {
  const UserCard = mod.default;
  const { rerender } = render(<UserCard userId={1} />);
  await screen.findByText('Ada Lovelace');
  rerender(<UserCard userId={2} />);
  expect(await screen.findByText('Alan Turing')).toBeInTheDocument();
});

test('ignores stale responses (no race condition)', async () => {
  const UserCard = mod.default;
  mockApi('/users/1', async () => {
    await sleep(150);
    return { id: 1, name: 'Ada Lovelace' };
  });
  const { rerender } = render(<UserCard userId={1} />);
  rerender(<UserCard userId={2} />);
  await screen.findByText('Alan Turing');
  await act(() => sleep(250));
  expect(screen.queryByText('Ada Lovelace')).toBeNull();
  expect(screen.getByText('Alan Turing')).toBeInTheDocument();
});

test('declares userId as an effect dependency', () => {
  expect(source).toMatch(/\[\s*userId\s*\]/);
});
