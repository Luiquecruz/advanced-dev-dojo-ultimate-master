const Card = modules['Card.vue'].default;
const ItemList = modules['ItemList.vue'].default;
const items = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
];

test('Card renders the header and default slots', () => {
  const wrapper = mount(Card, { slots: { header: 'Profile', default: '<p>Body text</p>' } });
  expect(wrapper.get('header').text()).toBe('Profile');
  expect(wrapper.get('.body').text()).toBe('Body text');
});

test('Card shows "Untitled" and no <footer> when slots are missing', () => {
  const wrapper = mount(Card);
  expect(wrapper.get('header').text()).toBe('Untitled');
  expect(wrapper.find('footer').exists()).toBe(false);
});

test('ItemList falls back to the item name', () => {
  const wrapper = mount(ItemList, { props: { items } });
  expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Keyboard', 'Mouse']);
});

test('ItemList passes item and index to the "item" scoped slot', () => {
  const { h } = require('vue');
  const wrapper = mount(ItemList, {
    props: { items },
    slots: { item: ({ item, index }) => h('b', `${index}:${item.price}`) },
  });
  expect(wrapper.findAll('li b').map((b) => b.text())).toEqual(['0:120', '1:45']);
});

test('App composes Card and ItemList with custom rows', () => {
  const wrapper = mount(mod.default);
  expect(wrapper.get('header').text()).toBe('Products');
  expect(wrapper.findAll('.item-list li').map((li) => li.text())).toEqual(['1. Keyboard ($120)', '2. Mouse ($45)']);
  expect(wrapper.get('footer').text()).toBe('2 items');
});
