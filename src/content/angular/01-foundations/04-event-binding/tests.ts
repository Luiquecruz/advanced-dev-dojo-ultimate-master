const messageInput = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLInputElement;
const sentMessages = () => screen.queryAllByRole('listitem').map((item) => item.textContent!.trim());

test('updates the character count while typing', async () => {
  const { element } = await render(mod.ChatComposer);
  await user.type(messageInput(), 'Hello');
  await stable();
  expect(element.querySelector('.count')).toHaveTextContent('5/140');
});

test('sends the trimmed message when Send is clicked and clears the input', async () => {
  await render(mod.ChatComposer);
  await user.type(messageInput(), '  Hi there ');
  await stable();
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await stable();
  expect(sentMessages()).toEqual(['Hi there']);
  expect(messageInput()).toHaveValue('');
});

test('sends with Enter', async () => {
  await render(mod.ChatComposer);
  await user.type(messageInput(), 'First{Enter}');
  await stable();
  await user.type(messageInput(), 'Second{Enter}');
  await stable();
  expect(sentMessages()).toEqual(['First', 'Second']);
});

test('clears the draft with Escape', async () => {
  const { element } = await render(mod.ChatComposer);
  await user.type(messageInput(), 'Oops{Escape}');
  await stable();
  expect(messageInput()).toHaveValue('');
  expect(element.querySelector('.count')).toHaveTextContent('0/140');
  expect(sentMessages()).toEqual([]);
});

test('ignores whitespace-only drafts', async () => {
  const { component, stable } = await render(mod.ChatComposer);
  await user.type(messageInput(), '   {Enter}');
  await stable();
  component.send();
  await stable();
  expect(sentMessages()).toEqual([]);
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});

test('uses key event filtering', () => {
  expect(source).toMatch(/\(keydown\.enter\)\s*=/);
  expect(source).toMatch(/\(keydown\.escape\)\s*=/);
});
