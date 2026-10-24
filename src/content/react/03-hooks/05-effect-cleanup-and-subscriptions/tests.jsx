const makeServer = () => {
  const log = [];
  const createConnection = fn((roomId) => ({
    connect: () => log.push(`connect ${roomId}`),
    disconnect: () => log.push(`disconnect ${roomId}`),
  }));
  return { log, createConnection };
};

test('connects to the initial room on mount', () => {
  const ChatRoom = mod.default;
  const { log, createConnection } = makeServer();
  render(<ChatRoom roomId="general" createConnection={createConnection} />);
  expect(screen.getByRole('heading')).toHaveTextContent('Welcome to #general');
  expect(log).toEqual(['connect general']);
});

test('switching rooms disconnects the old room before connecting the new one', () => {
  const ChatRoom = mod.default;
  const { log, createConnection } = makeServer();
  const { rerender } = render(<ChatRoom roomId="general" createConnection={createConnection} />);
  rerender(<ChatRoom roomId="travel" createConnection={createConnection} />);
  expect(log).toEqual(['connect general', 'disconnect general', 'connect travel']);
});

test('disconnects when the component unmounts', () => {
  const ChatRoom = mod.default;
  const { log, createConnection } = makeServer();
  const { unmount } = render(<ChatRoom roomId="general" createConnection={createConnection} />);
  unmount();
  expect(log).toEqual(['connect general', 'disconnect general']);
});

test('in StrictMode, the extra setup + cleanup cycle leaves exactly one open connection', () => {
  const ChatRoom = mod.default;
  const { log, createConnection } = makeServer();
  render(
    <React.StrictMode>
      <ChatRoom roomId="general" createConnection={createConnection} />
    </React.StrictMode>,
  );
  const open = log.filter((entry) => entry.startsWith('connect')).length - log.filter((entry) => entry.startsWith('disconnect')).length;
  expect(open).toBe(1);
});

test('shows Offline/Online from window events and removes the listeners on unmount', () => {
  const ChatRoom = mod.default;
  const { createConnection } = makeServer();
  const active = new Set();
  const originalAdd = window.addEventListener;
  const originalRemove = window.removeEventListener;
  window.addEventListener = function (type, listener, options) {
    if (type === 'online' || type === 'offline') active.add(listener);
    return originalAdd.call(this, type, listener, options);
  };
  window.removeEventListener = function (type, listener, options) {
    if (type === 'online' || type === 'offline') active.delete(listener);
    return originalRemove.call(this, type, listener, options);
  };
  try {
    const { unmount } = render(<ChatRoom roomId="general" createConnection={createConnection} />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('Offline')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(active.size).toBe(2);
    unmount();
    expect(active.size).toBe(0);
  } finally {
    window.addEventListener = originalAdd;
    window.removeEventListener = originalRemove;
  }
});
