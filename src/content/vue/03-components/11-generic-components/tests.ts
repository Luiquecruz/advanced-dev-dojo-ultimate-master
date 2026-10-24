const SelectList = modules['SelectList.vue'].default;
const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];

test('renders one option per item, falling back to the id', () => {
  const wrapper = mount(SelectList, { props: { items } });
  const options = wrapper.findAll('[role="option"]');
  expect(options.map((option) => option.text())).toEqual(['1', '2']);
});

test('emits select with the clicked item object', async () => {
  const wrapper = mount(SelectList, { props: { items } });
  await wrapper.findAll('[role="option"]')[1].trigger('click');
  expect(wrapper.emitted('select')).toEqual([[items[1]]]);
});

test('marks the selected item with aria-selected and passes selected to the slot', () => {
  const { h } = require('vue');
  const wrapper = mount(SelectList, {
    props: { items, selected: items[0] },
    slots: { default: ({ item, selected }) => h('span', `${item.name}:${selected}`) },
  });
  const options = wrapper.findAll('[role="option"]');
  expect(options[0].attributes('aria-selected')).toBe('true');
  expect(options[1].attributes('aria-selected')).toBe('false');
  expect(options.map((option) => option.text())).toEqual(['A:true', 'B:false']);
});

test('App works with users and products', async () => {
  render(mod.default);
  await user.click(screen.getByRole('option', { name: 'Alan Turing (editor)' }));
  await user.click(screen.getByRole('option', { name: 'Mouse $45' }));
  expect(screen.getByText('Selected user: Alan Turing')).toBeInTheDocument();
  expect(screen.getByText('Selected product: Mouse')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Mouse $45 ✓' })).toHaveAttribute('aria-selected', 'true');
});

test('declares a generic with a constraint and typed slots', () => {
  expect(sources['SelectList.vue']).toMatch(/generic\s*=\s*"T\s+extends\s*\{\s*id\s*:\s*number\s*;?\s*\}"/);
  expect(sources['SelectList.vue']).toMatch(/defineSlots\s*</);
});
