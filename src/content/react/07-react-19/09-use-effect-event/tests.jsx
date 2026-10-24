test('connects to the room on mount and shows the status', async () => {
  const ChatRoom = mod.default;
  render(<ChatRoom roomId="general" theme="light" />);
  expect(screen.getByRole('status')).toHaveTextContent('Connecting...');
  expect(mod.chatServer.log).toEqual(['connect:general']);
  expect(await screen.findByText('Connected to general (light theme)')).toBeInTheDocument();
});

test('changing the theme does not reconnect', async () => {
  const ChatRoom = mod.default;
  const { rerender } = render(<ChatRoom roomId="general" theme="light" />);
  await screen.findByText('Connected to general (light theme)');
  rerender(<ChatRoom roomId="general" theme="dark" />);
  await act(() => sleep(80));
  expect(mod.chatServer.log).toEqual(['connect:general']);
});

test('changing the room disconnects and reconnects', async () => {
  const ChatRoom = mod.default;
  const { rerender } = render(<ChatRoom roomId="general" theme="light" />);
  rerender(<ChatRoom roomId="music" theme="light" />);
  expect(mod.chatServer.log).toEqual(['connect:general', 'disconnect:general', 'connect:music']);
  expect(await screen.findByText('Connected to music (light theme)')).toBeInTheDocument();
});

test('the notification uses the latest theme when the event fires', async () => {
  const ChatRoom = mod.default;
  const { rerender } = render(<ChatRoom roomId="general" theme="light" />);
  rerender(<ChatRoom roomId="general" theme="dark" />);
  expect(await screen.findByText('Connected to general (dark theme)')).toBeInTheDocument();
  expect(mod.chatServer.log).toEqual(['connect:general']);
});

test('uses useEffectEvent and depends on [roomId] only', () => {
  expect(source).toMatch(/useEffectEvent\(/);
  expect(source).toMatch(/\}\s*,\s*\[\s*roomId\s*\]\s*\)/);
  expect(source).not.toMatch(/\[\s*roomId\s*,\s*theme\s*\]/);
});
