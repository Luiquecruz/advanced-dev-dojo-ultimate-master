test('toggles the details paragraph', async () => {
  render(mod.default);
  expect(document.querySelector('.details')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show details' }));
  expect(screen.getByText('Vue transitions are CSS driven.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Hide details' }));
  expect(document.querySelector('.details')).toBeNull();
});

test('adds notifications with increasing numbers', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Add notification' }));
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(items[2]).toHaveTextContent('Notification 3');
});

test('dismisses a notification', async () => {
  render(mod.default);
  await user.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(1);
  expect(items[0]).toHaveTextContent('Notification 2');
});

test('uses <Transition name="fade"> and <TransitionGroup name="list" tag="ul">', () => {
  expect(source).toMatch(/<Transition\s+name="fade"/);
  expect(source).toMatch(/<TransitionGroup\s+(name="list"\s+tag="ul"|tag="ul"\s+name="list")/);
});

test('defines the enter/leave classes in CSS', () => {
  ['.fade-enter-active', '.fade-leave-active', '.fade-enter-from', '.fade-leave-to', '.list-move', '.list-enter-from', '.list-leave-to'].forEach((selector) => {
    expect(source).toContain(selector);
  });
});
