const TruncatePipe = modules['truncate-pipe.ts'].TruncatePipe;
const text = (element: HTMLElement, selector: string) => element.querySelector(selector)!.textContent!.trim();

test('TruncatePipe shortens long text and keeps short text', () => {
  const pipe = new TruncatePipe();
  expect(pipe.transform('Hello brave new world', 6)).toBe('Hello…');
  expect(pipe.transform('Short', 10)).toBe('Short');
  expect(pipe.transform('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnopqrst…');
  expect(pipe.transform('Hello brave new world', 5, '...')).toBe('Hello...');
});

test('formats text with uppercase and titlecase', async () => {
  const { element } = await render(mod.OrderSummary);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Order AB12');
  expect(text(element, '.customer')).toBe('Ada Lovelace');
});

test('formats the total as euros and the discount as percent', async () => {
  const { element } = await render(mod.OrderSummary);
  expect(text(element, '.total')).toBe('€1,234.50');
  expect(text(element, '.discount')).toBe('15%');
});

test('formats the date in UTC', async () => {
  const { element } = await render(mod.OrderSummary);
  expect(text(element, '.date')).toBe('Mar 14, 2026');
});

test('truncates the note and re-runs when the order changes', async () => {
  const { element, component, stable } = await render(mod.OrderSummary);
  expect(text(element, '.note')).toBe('Please leave the pac…');
  component.order.update((order: any) => ({ ...order, note: 'Ring twice' }));
  await stable();
  expect(text(element, '.note')).toBe('Ring twice');
});

test('declares the custom pipe with @Pipe', () => {
  expect(sources['truncate-pipe.ts']).toMatch(/@Pipe\(\s*\{\s*name:\s*['"]truncate['"]/);
  expect(source).toMatch(/\|\s*truncate/);
});
