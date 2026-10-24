const isHidden = (element) => element.style.display === 'none';

test('shows Compose first and keeps History in the DOM but hidden', () => {
  const MailTabs = mod.default;
  render(<MailTabs />);
  expect(isHidden(screen.getByLabelText('Message').closest('label'))).toBe(false);
  const history = screen.getByText('History', { selector: 'h2' });
  expect(isHidden(history)).toBe(true);
});

test('keeps the typed message after switching tabs', async () => {
  const MailTabs = mod.default;
  render(<MailTabs />);
  await user.type(screen.getByLabelText('Message'), 'Hello Ada');
  await user.click(screen.getByRole('button', { name: 'History' }));
  await user.click(screen.getByRole('button', { name: 'Compose' }));
  expect(screen.getByLabelText('Message')).toHaveValue('Hello Ada');
});

test('hides the Compose panel with display: none while History is active', async () => {
  const MailTabs = mod.default;
  render(<MailTabs />);
  await user.click(screen.getByRole('button', { name: 'History' }));
  const label = document.querySelector('label');
  expect(label).not.toBeNull();
  expect(isHidden(label)).toBe(true);
  expect(isHidden(screen.getByRole('heading', { name: 'History' }))).toBe(false);
});

test('HistoryPanel only runs its effect while visible', async () => {
  const MailTabs = mod.default;
  render(<MailTabs />);
  expect(mod.connectionLog).toEqual([]);
  await user.click(screen.getByRole('button', { name: 'History' }));
  expect(mod.connectionLog).toEqual(['connect']);
  await user.click(screen.getByRole('button', { name: 'Compose' }));
  expect(mod.connectionLog).toEqual(['connect', 'disconnect']);
});

test('uses <Activity mode>', () => {
  expect(source).toMatch(/<Activity\s+mode=/);
});
