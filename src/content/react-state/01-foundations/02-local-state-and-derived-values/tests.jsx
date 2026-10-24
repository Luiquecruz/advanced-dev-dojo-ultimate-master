const list = () => mod.sampleNotifications.map((notification) => ({ ...notification }));

test('shows every notification and derives "N unread" from the props', () => {
  render(<mod.NotificationsPanel notifications={list()} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.getByTestId('unread-count')).toHaveTextContent('3 unread');
  expect(screen.getByTestId('details')).toHaveTextContent('Nothing selected');
});

test('marking the selected notification as read updates the count, the Unread filter and the details', async () => {
  render(<mod.NotificationsPanel notifications={list()} />);
  await user.click(screen.getByRole('button', { name: 'Deploy finished' }));
  expect(screen.getByTestId('details')).toHaveTextContent('Deploy finished (unread)');
  await user.click(screen.getByRole('button', { name: 'Mark Deploy finished as read' }));
  expect(screen.getByTestId('unread-count')).toHaveTextContent('2 unread');
  expect(screen.getByTestId('details')).toHaveTextContent('Deploy finished (read)');
  await user.click(screen.getByRole('button', { name: 'Unread' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Deploy finished' })).toBeNull();
});

test('notifications added later by the parent appear and keep local "read" marks', async () => {
  const { rerender } = render(<mod.NotificationsPanel notifications={list()} />);
  await user.click(screen.getByRole('button', { name: 'Mark Invoice #42 paid as read' }));
  rerender(<mod.NotificationsPanel notifications={[...list(), { id: 5, title: 'Password changed', read: false }]} />);
  expect(screen.getByRole('button', { name: 'Password changed' })).toBeInTheDocument();
  expect(screen.getByTestId('unread-count')).toHaveTextContent('3 unread');
  expect(screen.queryByRole('button', { name: 'Mark Invoice #42 paid as read' })).toBeNull();
});

test('removing the selected notification in the parent clears the details', async () => {
  const { rerender } = render(<mod.NotificationsPanel notifications={list()} />);
  await user.click(screen.getByRole('button', { name: 'Weekly summary ready' }));
  rerender(<mod.NotificationsPanel notifications={list().filter((notification) => notification.id !== 4)} />);
  expect(screen.getByTestId('details')).toHaveTextContent('Nothing selected');
  await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
  expect(screen.getByTestId('unread-count')).toHaveTextContent('0 unread');
});

test('switching the filter produces exactly one commit (measured with <Profiler>)', async () => {
  const onRender = fn();
  render(
    <React.Profiler id="panel" onRender={onRender}>
      <mod.NotificationsPanel notifications={list()} />
    </React.Profiler>,
  );
  onRender.mockClear();
  await user.click(screen.getByRole('button', { name: 'Unread' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(onRender).toHaveBeenCalledTimes(1);
});

test('derived values are computed during render, without useEffect', () => {
  expect(source).not.toMatch(/useEffect/);
});
