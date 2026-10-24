const UserCard = modules['UserCard.vue'].default;

test('UserCard renders the name in an <h3> and the role', () => {
  const wrapper = mount(UserCard, { props: { name: 'Ada Lovelace', role: 'Admin', online: true } });
  expect(wrapper.get('h3').text()).toBe('Ada Lovelace');
  expect(wrapper.get('.role').text()).toBe('Admin');
  expect(wrapper.get('.status').text()).toBe('Online');
});

test('UserCard falls back to "Member" and "Offline"', () => {
  const wrapper = mount(UserCard, { props: { name: 'Grace Hopper' } });
  expect(wrapper.get('.role').text()).toBe('Member');
  expect(wrapper.get('.status').text()).toBe('Offline');
});

test('UserCard reacts when props change', async () => {
  const wrapper = mount(UserCard, { props: { name: 'Ada', online: false } });
  await wrapper.setProps({ name: 'Ada Lovelace', online: true });
  expect(wrapper.get('h3').text()).toBe('Ada Lovelace');
  expect(wrapper.get('.status').text()).toBe('Online');
});

test('App renders one card per user with the default role for Grace', () => {
  const wrapper = mount(mod.default);
  const cards = wrapper.findAll('.user-card');
  expect(cards).toHaveLength(3);
  expect(cards[2].get('h3').text()).toBe('Grace Hopper');
  expect(cards[2].get('.role').text()).toBe('Member');
});

test('UserCard declares its props with defineProps', () => {
  expect(sources['UserCard.vue']).toMatch(/defineProps\s*</);
});
