test('Modal renders nothing when closed', () => {
  const { Modal } = mod;
  render(<Modal open={false} title="Hidden" onClose={() => {}} />);
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('Modal renders the dialog into document.body, outside the render container', () => {
  const { Modal } = mod;
  const { container } = render(
    <Modal open title="Profile" onClose={() => {}}>
      <p>Body text</p>
    </Modal>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Profile' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog.parentElement).toBe(document.body);
  expect(container.contains(dialog)).toBe(false);
  expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Profile');
  expect(within(dialog).getByText('Body text')).toBeInTheDocument();
});

test('the Close button calls onClose', async () => {
  const { Modal } = mod;
  const onClose = fn();
  render(<Modal open title="Profile" onClose={onClose} />);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('App opens the "Settings" modal and closes it again', async () => {
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Open modal' }));
  const dialog = screen.getByRole('dialog', { name: 'Settings' });
  expect(within(dialog).getByText('Portal content')).toBeInTheDocument();
  expect(screen.getByTestId('app').contains(dialog)).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('clicks inside the portal bubble to the app through the React tree', async () => {
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Open modal' }));
  expect(screen.getByText('Clicks inside app: 1')).toBeInTheDocument();
  await user.click(screen.getByText('Portal content'));
  expect(screen.getByText('Clicks inside app: 2')).toBeInTheDocument();
});
