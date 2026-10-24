test('the "Save draft" button in the header shows a toast in the list', async () => {
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  await user.click(screen.getByRole('button', { name: 'Upload' }));
  const list = screen.getByRole('list', { name: 'Notifications' });
  expect(within(list).getAllByRole('listitem').map((item) => item.firstChild.textContent)).toEqual(['Draft saved', 'Upload failed']);
  expect(within(list).getByText('Upload failed').closest('li')).toHaveClass('toast-error');
});

test('dismiss removes only that notification, even after several quick notifications', async () => {
  const { NotificationsProvider, NotificationList, useNotifications } = mod;
  function Burst() {
    const { notify } = useNotifications();
    return (
      <button
        onClick={() => {
          notify('One');
          notify('Two');
          notify('Three');
        }}
      >
        Burst
      </button>
    );
  }
  render(
    <NotificationsProvider>
      <Burst />
      <NotificationList />
    </NotificationsProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Burst' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Dismiss Two' }));
  expect(screen.getAllByRole('listitem').map((item) => item.firstChild.textContent)).toEqual(['One', 'Three']);
});

test('useNotifications throws a helpful error outside NotificationsProvider', () => {
  expect(() => renderHook(() => mod.useNotifications())).toThrow(/NotificationsProvider/);
});

test('consumers do not re-render when the provider re-renders without changes', async () => {
  const { NotificationsProvider, useNotifications } = mod;
  const renders = fn();
  const Consumer = React.memo(function Consumer() {
    useNotifications();
    renders();
    return null;
  });
  function Parent() {
    const [count, setCount] = React.useState(0);
    return (
      <>
        <button onClick={() => setCount(count + 1)}>Parent renders: {count}</button>
        <NotificationsProvider>
          <Consumer />
        </NotificationsProvider>
      </>
    );
  }
  render(<Parent />);
  await user.click(screen.getByRole('button', { name: 'Parent renders: 0' }));
  await user.click(screen.getByRole('button', { name: 'Parent renders: 1' }));
  expect(renders).toHaveBeenCalledTimes(1);
});

test('notify and dismiss keep the same identity when notifications change', () => {
  const { result } = renderHook(() => mod.useNotifications(), { wrapper: mod.NotificationsProvider });
  const { notify, dismiss } = result.current;
  act(() => {
    notify('Saved');
  });
  expect(result.current.notifications).toHaveLength(1);
  expect(result.current.notify).toBe(notify);
  expect(result.current.dismiss).toBe(dismiss);
});

test('each provider scopes its own notifications and uses the React 19 syntax', async () => {
  const { NotificationsProvider, NotificationList, useNotifications } = mod;
  function Ping({ label }) {
    const { notify } = useNotifications();
    return <button onClick={() => notify(`${label} ping`)}>{label}</button>;
  }
  render(
    <>
      <section aria-label="Left">
        <NotificationsProvider>
          <Ping label="Left" />
          <NotificationList />
        </NotificationsProvider>
      </section>
      <section aria-label="Right">
        <NotificationsProvider>
          <Ping label="Right" />
          <NotificationList />
        </NotificationsProvider>
      </section>
    </>,
  );
  await user.click(screen.getByRole('button', { name: 'Left' }));
  expect(within(screen.getByRole('region', { name: 'Left' })).getAllByRole('listitem')).toHaveLength(1);
  expect(within(screen.getByRole('region', { name: 'Right' })).queryAllByRole('listitem')).toHaveLength(0);
  expect(source).not.toMatch(/\.Provider\b/);
});
