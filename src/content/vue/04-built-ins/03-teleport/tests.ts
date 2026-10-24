const ModalDialog = modules['ModalDialog.vue'].default;

test('renders nothing while closed', () => {
  render(mod.default);
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('teleports the open dialog to <body>, outside the card', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Open dialog' }));
  const dialog = screen.getByRole('dialog', { name: 'Confirm' });
  expect(dialog).toHaveTextContent('Teleported to the body!');
  expect(document.querySelector('.card').contains(dialog)).toBe(false);
  expect(dialog.closest('.backdrop').parentElement).toBe(document.body);
});

test('Close button and Escape emit close', async () => {
  const onClose = fn();
  render(ModalDialog, { props: { open: true, title: 'Hi', onClose } });
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('clicking the backdrop closes, clicking the dialog does not', async () => {
  const onClose = fn();
  render(ModalDialog, { props: { open: true, title: 'Hi', onClose } });
  await user.click(screen.getByRole('heading', { name: 'Hi' }));
  expect(onClose).not.toHaveBeenCalled();
  await fireEvent.click(document.querySelector('.backdrop'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('App closes the dialog on close', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Open dialog' }));
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(sources['ModalDialog.vue']).toMatch(/<Teleport\s+to="body"/);
});
