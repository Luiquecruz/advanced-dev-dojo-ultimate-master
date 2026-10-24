test('renders three tabs with Home selected', () => {
  render(mod.default);
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((tab) => tab.textContent.trim())).toEqual(['Home', 'Profile', 'Settings']);
  expect(screen.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
});

test('switches the panel to Profile', async () => {
  render(mod.default);
  await user.click(screen.getByRole('tab', { name: 'Profile' }));
  expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Home' })).toBeNull();
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
});

test('loads the async Settings tab on demand', async () => {
  render(mod.default);
  await user.click(screen.getByRole('tab', { name: 'Settings' }));
  expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
});

test('uses defineAsyncComponent with a dynamic import and <component :is>', () => {
  expect(source).toMatch(/defineAsyncComponent\s*\(\s*\(\)\s*=>\s*import\s*\(\s*['"]\.\/SettingsTab(\.vue)?['"]/);
  expect(source).toMatch(/<component\s[^>]*:is=/);
});
