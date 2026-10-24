test('Chat keeps its own draft for the given contact', async () => {
  const Chat = mod.Chat;
  render(<Chat contact={{ id: 9, name: 'Linus Torvalds' }} />);
  const textarea = screen.getByRole('textbox', { name: 'Message to Linus Torvalds' });
  await user.type(textarea, 'Hello');
  expect(textarea).toHaveValue('Hello');
});

test('switching to another contact starts with an empty draft', async () => {
  const Messenger = mod.default;
  render(<Messenger />);
  await user.type(screen.getByRole('textbox', { name: 'Message to Ada Lovelace' }), 'Hi Ada');
  await user.click(screen.getByRole('button', { name: 'Alan Turing' }));
  expect(screen.getByRole('textbox', { name: 'Message to Alan Turing' })).toHaveValue('');
});

test('switching back to a previous contact also starts empty', async () => {
  const Messenger = mod.default;
  render(<Messenger />);
  await user.type(screen.getByRole('textbox', { name: 'Message to Ada Lovelace' }), 'Hi Ada');
  await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));
  await user.type(screen.getByRole('textbox', { name: 'Message to Grace Hopper' }), 'Hi Grace');
  await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
  expect(screen.getByRole('textbox', { name: 'Message to Ada Lovelace' })).toHaveValue('');
});

test('clicking the selected contact again keeps the draft', async () => {
  const Messenger = mod.default;
  render(<Messenger />);
  await user.type(screen.getByRole('textbox', { name: 'Message to Ada Lovelace' }), 'Still typing');
  await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
  expect(screen.getByRole('textbox', { name: 'Message to Ada Lovelace' })).toHaveValue('Still typing');
});

test('resets Chat with a key instead of an effect', () => {
  expect(source).toMatch(/<Chat[^>]*\bkey=\{/);
  expect(source).not.toMatch(/useEffect/);
});
