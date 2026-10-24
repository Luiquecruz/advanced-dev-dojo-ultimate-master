const createChat = () => {
  const listeners = {};
  const chat = {
    unsubscribes: {},
    subscribe: fn((roomId, onMessage) => {
      listeners[roomId] = onMessage;
      const unsubscribe = fn(() => {
        delete listeners[roomId];
      });
      chat.unsubscribes[roomId] = unsubscribe;
      return unsubscribe;
    }),
    emit: (roomId) => act(() => listeners[roomId]?.('hello')),
  };
  return chat;
};

test('RoomStatus is a function component (no class)', () => {
  const RoomStatus = mod.default;
  expect(typeof RoomStatus).toBe('function');
  expect(RoomStatus.prototype?.isReactComponent).toBeFalsy();
  expect(source).not.toMatch(/\bclass\s+\w+\s+extends\b/);
  expect(source).toMatch(/useEffect\s*\(/);
});

test('subscribes on mount and counts incoming messages', () => {
  const RoomStatus = mod.default;
  const chat = createChat();
  render(<RoomStatus roomId="general" chat={chat} />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Room: general');
  expect(chat.subscribe).toHaveBeenCalledTimes(1);
  expect(chat.subscribe.mock.calls[0][0]).toBe('general');
  chat.emit('general');
  chat.emit('general');
  expect(screen.getByText('Messages: 2')).toBeInTheDocument();
});

test('switching rooms unsubscribes, resubscribes and resets the count', () => {
  const RoomStatus = mod.default;
  const chat = createChat();
  const { rerender } = render(<RoomStatus roomId="general" chat={chat} />);
  chat.emit('general');
  rerender(<RoomStatus roomId="random" chat={chat} />);
  expect(chat.unsubscribes.general).toHaveBeenCalled();
  expect(chat.subscribe.mock.calls.at(-1)[0]).toBe('random');
  expect(screen.getByText('Messages: 0')).toBeInTheDocument();
  chat.emit('random');
  expect(screen.getByText('Messages: 1')).toBeInTheDocument();
});

test('unsubscribes on unmount', () => {
  const RoomStatus = mod.default;
  const chat = createChat();
  const { unmount } = render(<RoomStatus roomId="general" chat={chat} />);
  unmount();
  expect(chat.unsubscribes.general).toHaveBeenCalled();
});

test('keeps document.title as "(count) roomId" and "Clear" resets the count', async () => {
  const RoomStatus = mod.default;
  const chat = createChat();
  render(<RoomStatus roomId="general" chat={chat} />);
  expect(document.title).toBe('(0) general');
  chat.emit('general');
  chat.emit('general');
  expect(document.title).toBe('(2) general');
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText('Messages: 0')).toBeInTheDocument();
  expect(document.title).toBe('(0) general');
});
