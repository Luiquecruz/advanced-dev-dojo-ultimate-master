test('"Show toast" creates a Toast with the message each time', async () => {
  await render(mod.Toaster);
  const button = screen.getByRole('button', { name: 'Show toast' });
  await user.click(button);
  await user.click(button);
  await stable();
  const alerts = screen.getAllByRole('alert');
  expect(alerts).toHaveLength(2);
  expect(alerts[0]).toHaveTextContent('Saved!');
});

test('show() returns a ComponentRef whose input comes from inputBinding', async () => {
  const { component } = await render(mod.Toaster);
  const ref = component.show('Custom');
  await stable();
  expect(ref.instance).toBeInstanceOf(mod.Toast);
  expect(ref.instance.message()).toBe('Custom');
  expect(screen.getByRole('alert')).toHaveTextContent('Custom');
});

test('the Close button destroys only its own toast', async () => {
  const { component } = await render(mod.Toaster);
  component.show('First');
  component.show('Second');
  await stable();
  await user.click(within(screen.getByText(/First/)).getByRole('button', { name: 'Close' }));
  await stable();
  const alerts = screen.getAllByRole('alert');
  expect(alerts).toHaveLength(1);
  expect(alerts[0]).toHaveTextContent('Second');
});

test('"Clear all" removes every toast', async () => {
  const { component } = await render(mod.Toaster);
  component.show('A');
  component.show('B');
  await stable();
  await user.click(screen.getByRole('button', { name: 'Clear all' }));
  await stable();
  expect(screen.queryAllByRole('alert')).toHaveLength(0);
});

test('Dashboard switches widgets with NgComponentOutlet and passes the title input', async () => {
  await render(mod.Dashboard);
  expect(screen.getByRole('heading')).toHaveTextContent('Panel: Users');
  await user.click(screen.getByRole('button', { name: 'Stats' }));
  await stable();
  expect(screen.getByRole('heading')).toHaveTextContent('Panel: Stats');
  expect(source).toMatch(/ngComponentOutlet/);
});
