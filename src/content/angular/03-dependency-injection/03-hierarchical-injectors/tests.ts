test('CounterStore is not provided in root', () => {
  const { CounterStore } = modules['counter-store.ts'];
  expect(TestBed.inject(CounterStore, null)).toBeNull();
});

test('renders two panels at "Count: 0" and a display without store', async () => {
  const { element } = await render(mod.App);
  expect(element.querySelectorAll('section')).toHaveLength(2);
  expect(screen.getAllByText('Count: 0')).toHaveLength(2);
  expect(screen.getByText('No store')).toBeInTheDocument();
});

test('each panel has its own CounterStore instance', async () => {
  const { element } = await render(mod.App);
  const [first, second] = Array.from(element.querySelectorAll('section'));
  await user.click(within(first).getByRole('button', { name: '+1' }));
  await user.click(within(first).getByRole('button', { name: '+1' }));
  await user.click(within(second).getByRole('button', { name: '+1' }));
  await stable();
  expect(within(first).getByText('Count: 2')).toBeInTheDocument();
  expect(within(second).getByText('Count: 1')).toBeInTheDocument();
});

test('CounterPanel declares the provider and CounterDisplay injects it optionally', () => {
  expect(source).toMatch(/providers\s*:\s*\[\s*CounterStore/);
  expect(source).toMatch(/inject\(\s*CounterStore\s*,\s*\{\s*optional\s*:\s*true/);
});
