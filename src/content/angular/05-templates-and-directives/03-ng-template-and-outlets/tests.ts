test('renders each item with the default template', async () => {
  await render(mod.ItemList, { inputs: { items: ['Red', 'Green'] } });
  const items = screen.getAllByRole('listitem').map((item) => item.textContent.trim());
  expect(items).toEqual(['Red', 'Green']);
});

test('renders "No items" for an empty list', async () => {
  await render(mod.ItemList, { inputs: { items: [] } });
  expect(screen.getByText('No items').tagName).toBe('P');
  expect(screen.queryByRole('list')).toBeNull();
});

test('App renders items through the custom template with index context', async () => {
  await render(mod.App);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(3);
  expect(within(items[0]).getByText('1. Apple').tagName).toBe('STRONG');
  expect(within(items[2]).getByText('3. Cherry')).toBeInTheDocument();
});

test('uses ngTemplateOutlet with a context', () => {
  expect(source).toMatch(/ngTemplateOutlet/);
  expect(source).toMatch(/\$implicit/);
});
