test('submits the form without reloading the page (.prevent)', async () => {
  render(mod.default);
  const form = document.querySelector('form')!;
  const event = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  await nextTick();
  expect(event.defaultPrevented).toBe(true);
  expect(screen.getByText('Submitted 1 times')).toBeInTheDocument();
});

test('counts clicks on the card but not on "Like" (.stop)', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Like' }));
  await user.click(screen.getByRole('button', { name: 'Like' }));
  expect(screen.getByText('Likes: 2')).toBeInTheDocument();
  expect(screen.getByText('Card clicks: 0')).toBeInTheDocument();
  await user.click(screen.getByText(/Card clicks/));
  expect(screen.getByText('Card clicks: 1')).toBeInTheDocument();
});

test('claims the bonus only once (.once)', async () => {
  render(mod.default);
  const button = screen.getByRole('button', { name: 'Claim bonus' });
  await user.click(button);
  await user.click(button);
  await user.click(button);
  expect(screen.getByText('Bonus: 10')).toBeInTheDocument();
});

test('adds a trimmed tag and clears the input on Enter', async () => {
  render(mod.default);
  const input = screen.getByRole('textbox', { name: 'New tag' });
  await user.type(input, '  vue  {Enter}');
  await user.type(input, 'pinia{Enter}');
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['vue', 'pinia']);
  expect(input).toHaveValue('');
});

test('uses the .prevent, .stop, .once and .enter modifiers', () => {
  expect(source).toMatch(/@submit\.prevent|v-on:submit\.prevent/);
  expect(source).toMatch(/\.stop\b/);
  expect(source).toMatch(/\.once\b/);
  expect(source).toMatch(/\.enter\b/);
  expect(source).not.toMatch(/preventDefault|stopPropagation/);
});
