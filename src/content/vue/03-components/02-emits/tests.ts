const CartItem = modules['CartItem.vue'].default;

test('CartItem emits changeQuantity with 1 and -1', async () => {
  const wrapper = mount(CartItem, { props: { name: 'Mouse', quantity: 2 } });
  await wrapper.get('[aria-label="Increase"]').trigger('click');
  await wrapper.get('[aria-label="Decrease"]').trigger('click');
  expect(wrapper.emitted('changeQuantity')).toEqual([[1], [-1]]);
});

test('CartItem emits remove without arguments', async () => {
  const onRemove = fn();
  const wrapper = mount(CartItem, { props: { name: 'Mouse', quantity: 2, onRemove } });
  await wrapper.get('[aria-label="Remove"]').trigger('click');
  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(wrapper.get('.quantity').text()).toBe('2');
});

test('App shows "Total items: 3" and updates it when increasing', async () => {
  render(mod.default);
  expect(screen.getByText('Total items: 3')).toBeInTheDocument();
  await user.click(screen.getAllByRole('button', { name: 'Increase' })[0]);
  expect(screen.getByText('Total items: 4')).toBeInTheDocument();
});

test('App never lets a quantity drop below 1', async () => {
  const wrapper = mount(mod.default);
  await wrapper.findAll('[aria-label="Decrease"]')[0].trigger('click');
  expect(wrapper.findAll('.quantity')[0].text()).toBe('1');
  expect(wrapper.get('.total').text()).toBe('Total items: 3');
});

test('App removes an item when CartItem emits remove', async () => {
  const wrapper = mount(mod.default);
  await wrapper.findAll('[aria-label="Remove"]')[1].trigger('click');
  expect(wrapper.findAll('.cart-item')).toHaveLength(1);
  expect(wrapper.get('.total').text()).toBe('Total items: 1');
});

test('CartItem declares its events with defineEmits', () => {
  expect(sources['CartItem.vue']).toMatch(/defineEmits\s*[<(]/);
});
