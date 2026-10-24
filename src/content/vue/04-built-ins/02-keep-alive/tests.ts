test('starts on the Draft tab', () => {
  render(mod.default);
  expect(screen.getByRole('textbox', { name: 'Draft' })).toBeInTheDocument();
});

test('keeps the draft text after switching tabs', async () => {
  render(mod.default);
  await user.type(screen.getByRole('textbox', { name: 'Draft' }), 'Hello');
  await user.click(screen.getByRole('button', { name: 'Stats' }));
  expect(screen.queryByRole('textbox', { name: 'Draft' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Draft' }));
  expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('Hello');
  expect(screen.getByText('5 characters')).toBeInTheDocument();
});

test('StatsTab counts activations with onActivated', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Stats' }));
  expect(screen.getByText('Activated 1 times')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Draft' }));
  await user.click(screen.getByRole('button', { name: 'Stats' }));
  expect(screen.getByText('Activated 2 times')).toBeInTheDocument();
});

test('uses <KeepAlive> and onActivated', () => {
  expect(sources['App.vue']).toMatch(/<KeepAlive[\s>]/);
  expect(sources['StatsTab.vue']).toMatch(/onActivated\s*\(/);
});
