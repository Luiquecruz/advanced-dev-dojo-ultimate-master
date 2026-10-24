const settings = [
  { id: 'profile', label: 'Profile', content: 'Name, avatar and bio.' },
  { id: 'security', label: 'Security', content: 'Password and two-factor authentication.' },
  { id: 'notifications', label: 'Notifications', content: 'Email and push preferences.' },
];

const renderTabs = () => render(<mod.Tabs label="Account settings" tabs={settings} />);

test('renders a tablist named by the label with the first tab selected', () => {
  renderTabs();
  const tablist = screen.getByRole('tablist', { name: 'Account settings' });
  const tabs = within(tablist).getAllByRole('tab');
  expect(tabs).toHaveLength(3);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
});

test('uses a roving tabIndex: only the selected tab is in the Tab order', () => {
  renderTabs();
  const tabs = screen.getAllByRole('tab');
  expect(tabs[0]).toHaveAttribute('tabindex', '0');
  expect(tabs[1]).toHaveAttribute('tabindex', '-1');
  expect(tabs[2]).toHaveAttribute('tabindex', '-1');
});

test('the tabpanel is linked to its tab with aria-controls and aria-labelledby', () => {
  renderTabs();
  const panel = screen.getByRole('tabpanel', { name: 'Profile' });
  expect(panel).toHaveTextContent('Name, avatar and bio.');
  expect(panel).toHaveAttribute('tabindex', '0');
  expect(screen.getByRole('tab', { name: 'Profile' }).getAttribute('aria-controls')).toBe(panel.id);
});

test('clicking a tab selects it and shows its panel', async () => {
  renderTabs();
  await user.click(screen.getByRole('tab', { name: 'Security' }));
  expect(screen.getByRole('tab', { name: 'Security' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Security' })).toHaveTextContent('Password and two-factor authentication.');
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('tabindex', '-1');
});

test('ArrowRight and ArrowLeft move focus and selection, wrapping around', async () => {
  renderTabs();
  await user.tab();
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: 'Security' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: 'Security' })).toHaveAttribute('aria-selected', 'true');
  await user.keyboard('{ArrowRight}{ArrowRight}');
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus();
  await user.keyboard('{ArrowLeft}');
  expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveFocus();
  expect(screen.getByRole('tabpanel', { name: 'Notifications' })).toBeInTheDocument();
});

test('Home and End jump to the first and last tab', async () => {
  renderTabs();
  await user.tab();
  await user.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveAttribute('aria-selected', 'true');
  await user.keyboard('{Home}');
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
});
