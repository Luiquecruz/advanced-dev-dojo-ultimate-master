test('loads user 1 immediately', async () => {
  render(mod.default);
  expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
});

test('loads the next user when userId changes', async () => {
  render(mod.default);
  await screen.findByRole('heading', { name: 'Ada Lovelace' });
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByRole('heading', { name: 'Alan Turing' })).toBeInTheDocument();
});

test('logs "old → new" for each change, but not for the immediate run', async () => {
  render(mod.default);
  await screen.findByRole('heading', { name: 'Ada Lovelace' });
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Previous' }));
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['1 → 2', '2 → 3', '3 → 2']);
});

test('keeps document.title in sync with userId', async () => {
  render(mod.default);
  expect(document.title).toBe('User 1');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(document.title).toBe('User 2'));
});

test('uses watch with immediate: true and watchEffect', () => {
  expect(source).toMatch(/watch\(\s*(userId|\(\)\s*=>\s*userId\.value)/);
  expect(source).toMatch(/immediate\s*:\s*true/);
  expect(source).toMatch(/watchEffect\(/);
});
