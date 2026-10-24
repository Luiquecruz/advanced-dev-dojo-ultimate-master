test('renders one tab button per projected tab', async () => {
  await render(mod.App);
  const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent.trim());
  expect(tabs).toEqual(['Profile', 'Settings']);
});

test('only the first tab content is visible initially', async () => {
  await render(mod.App);
  expect(screen.getByText('Profile content')).toBeInTheDocument();
  expect(screen.queryByText('Settings content')).toBeNull();
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'false');
});

test('clicking a tab shows its content and hides the others', async () => {
  await render(mod.App);
  await user.click(screen.getByRole('tab', { name: 'Settings' }));
  await stable();
  expect(screen.getByText('Settings content')).toBeInTheDocument();
  expect(screen.queryByText('Profile content')).toBeNull();
  expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
});

test('contentChildren updates when a tab is added', async () => {
  await render(mod.App);
  await user.click(screen.getByRole('button', { name: 'Add tab' }));
  await stable();
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  await user.click(screen.getByRole('tab', { name: 'Extra' }));
  await stable();
  expect(screen.getByText('Extra content')).toBeInTheDocument();
});

test('"Focus search" focuses the input through viewChild()', async () => {
  await render(mod.App);
  await user.click(screen.getByRole('button', { name: 'Focus search' }));
  expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
  expect(source).toMatch(/contentChildren\(\s*Tab/);
  expect(source).toMatch(/viewChild[\w.<>\s]*\(\s*['"]field['"]/);
});
