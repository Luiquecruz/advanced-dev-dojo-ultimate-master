test('shows the initial waiting state', async () => {
  await render(mod.ProgressCard);
  expect(screen.getByText('0%')).toBeTruthy();
  expect(screen.getByText('Waiting')).toBeTruthy();
});

test('renders repeated external callbacks without a manual check', async () => {
  const { component, stable } = await render(mod.ProgressCard);
  component.receiveProgress(25);
  await stable();
  expect(screen.getByText('25%')).toBeTruthy();
  expect(screen.getByText('Running')).toBeTruthy();
  component.receiveProgress(68);
  await stable();
  expect(screen.getByText('68%')).toBeTruthy();
});

test('clamps boundaries and ignores non-finite values', async () => {
  const { component, stable } = await render(mod.ProgressCard);
  component.receiveProgress(140);
  await stable();
  expect(screen.getByText('100%')).toBeTruthy();
  expect(screen.getByText('Complete')).toBeTruthy();
  component.receiveProgress(Number.NaN);
  component.receiveProgress(Infinity);
  await stable();
  expect(screen.getByText('100%')).toBeTruthy();
  component.receiveProgress(-3);
  await stable();
  expect(screen.getByText('0%')).toBeTruthy();
});

test('resets progress through the bound button', async () => {
  const { component, stable } = await render(mod.ProgressCard);
  component.receiveProgress(75);
  await stable();
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  await stable();
  expect(screen.getByText('0%')).toBeTruthy();
  expect(screen.getByText('Waiting')).toBeTruthy();
});
