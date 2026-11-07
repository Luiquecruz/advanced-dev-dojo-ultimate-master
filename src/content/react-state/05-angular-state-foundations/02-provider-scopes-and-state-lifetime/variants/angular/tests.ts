test('SharedCounter is a root singleton with a read-only count', () => {
  const { SharedCounter } = modules['counters.ts'];
  const shared = TestBed.inject(SharedCounter);
  expect(TestBed.inject(SharedCounter)).toBe(shared);
  shared.increment();
  expect(shared.count()).toBe(1);
  expect(shared.count.set).toBeUndefined();
});

test('LocalCounter is not provided in root', () => {
  const { LocalCounter } = modules['counters.ts'];
  expect(() => TestBed.inject(LocalCounter)).toThrow();
  expect(sources['counters.ts']).toMatch(/@Injectable\(\s*\)\s*export class LocalCounter/);
});

test('Counter lists LocalCounter in its own providers', () => {
  expect(sources['app.ts']).toMatch(/providers:\s*\[\s*LocalCounter\s*\]/);
});

test('each Counter has its own Local value while Shared is common', async () => {
  await render(mod.Page);
  const locals = () => screen.getAllByText(/^Local: /).map((node) => node.textContent.trim());
  const shareds = () => screen.getAllByText(/^Shared: /).map((node) => node.textContent.trim());
  expect(locals()).toEqual(['Local: 0', 'Local: 0']);
  await user.click(screen.getAllByRole('button', { name: 'Local +1' })[0]);
  await user.click(screen.getAllByRole('button', { name: 'Local +1' })[0]);
  await user.click(screen.getAllByRole('button', { name: 'Shared +1' })[1]);
  await stable();
  expect(locals()).toEqual(['Local: 2', 'Local: 0']);
  expect(shareds()).toEqual(['Shared: 1', 'Shared: 1']);
});
