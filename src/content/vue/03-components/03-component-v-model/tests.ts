const RatingInput = modules['RatingInput.vue'].default;

test('RatingInput emits update:modelValue with the clicked star', async () => {
  const onUpdate = fn();
  const wrapper = mount(RatingInput, { props: { modelValue: 2, 'onUpdate:modelValue': onUpdate } });
  await wrapper.get('[aria-label="Rate 4"]').trigger('click');
  expect(onUpdate).toHaveBeenCalledWith(4);
});

test('stars up to the current rating have aria-pressed="true"', () => {
  const wrapper = mount(RatingInput, { props: { modelValue: 3 } });
  expect(wrapper.get('[aria-label="Rate 3"]').attributes('aria-pressed')).toBe('true');
  expect(wrapper.get('[aria-label="Rate 4"]').attributes('aria-pressed')).toBe('false');
});

test('App updates "Rating: N" through v-model', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Rate 4' }));
  expect(screen.getByText('Rating: 4')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Rate 4' })).toHaveAttribute('aria-pressed', 'true');
});

test('App syncs the comment through v-model:comment', async () => {
  const wrapper = mount(mod.default);
  await wrapper.get('textarea').setValue('Great course');
  expect(wrapper.get('.comment').text()).toBe('Great course');
});

test('RatingInput uses defineModel for both models', () => {
  expect(sources['RatingInput.vue']).toMatch(/defineModel\s*(<[^>]*>)?\s*\(\s*\{/);
  expect(sources['RatingInput.vue']).toMatch(/defineModel\s*(<[^>]*>)?\s*\(\s*['"]comment['"]/);
});
