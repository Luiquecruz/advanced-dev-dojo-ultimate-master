const RatingInput = modules['RatingInput.vue'].default;
const ratingSource = sources['RatingInput.vue'];

test('renders 5 buttons by default and "max" buttons when provided', () => {
  const byDefault = mount(RatingInput, { props: { modelValue: 0, label: 'Rate' } });
  expect(byDefault.findAll('button')).toHaveLength(5);
  const custom = mount(RatingInput, { props: { modelValue: 0, label: 'Rate', max: 3 } });
  expect(custom.findAll('button')).toHaveLength(3);
  expect(custom.get('button').attributes('aria-label')).toBe('Rate 1 of 3');
});

test('marks buttons up to modelValue with aria-pressed="true" and shows the label', () => {
  const wrapper = mount(RatingInput, { props: { modelValue: 2, label: 'Quality' } });
  expect(wrapper.get('legend').text()).toBe('Quality');
  expect(wrapper.findAll('button').map((button) => button.attributes('aria-pressed'))).toEqual(['true', 'true', 'false', 'false', 'false']);
});

test('clicking emits update:modelValue with the value and change with value and previous value', async () => {
  const wrapper = mount(RatingInput, { props: { modelValue: 2, label: 'Rate' } });
  await wrapper.findAll('button')[3].trigger('click');
  expect(wrapper.emitted('update:modelValue')).toEqual([[4]]);
  expect(wrapper.emitted('change')).toEqual([[4, 2]]);
});

test('works with v-model in App.vue', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Rate 4 of 5' }));
  expect(screen.getByText('Rating: 4')).toBeInTheDocument();
});

test('uses type-based defineProps and defineEmits declarations', () => {
  expect(ratingSource).toMatch(/defineProps\s*<\s*\w+/);
  expect(ratingSource).toMatch(/defineEmits\s*<\s*\{/);
});
