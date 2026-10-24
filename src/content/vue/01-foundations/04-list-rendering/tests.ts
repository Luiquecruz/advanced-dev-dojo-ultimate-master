test('renders one <li> per todo with its position', () => {
  const wrapper = mount(mod.default);
  const spans = wrapper.findAll('li span').map((span) => span.text());
  expect(spans).toEqual(['1. Learn Vue', '2. Build an app', '3. Ship it']);
});

test('removes the clicked todo and renumbers the rest', async () => {
  const wrapper = mount(mod.default);
  await wrapper.findAll('li')[0].get('button').trigger('click');
  const spans = wrapper.findAll('li span').map((span) => span.text());
  expect(spans).toEqual(['1. Build an app', '2. Ship it']);
});

test('keeps the same DOM node for an item when another one is removed (stable key)', async () => {
  const wrapper = mount(mod.default);
  const shipItNode = wrapper.findAll('li')[2].element;
  await wrapper.findAll('li')[0].get('button').trigger('click');
  const remaining = wrapper.findAll('li');
  expect(remaining).toHaveLength(2);
  expect(remaining[1].element).toBe(shipItNode);
});

test('shows "All done!" instead of the list when empty', async () => {
  render(mod.default);
  expect(screen.queryByText('All done!')).toBeNull();
  for (let round = 0; round < 3; round++) {
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
  }
  expect(screen.getByText('All done!')).toBeInTheDocument();
  expect(screen.queryByRole('list')).toBeNull();
});

test('keys the list by todo.id', () => {
  expect(source).toMatch(/:key\s*=\s*"\s*\w+\.id\s*"/);
});
