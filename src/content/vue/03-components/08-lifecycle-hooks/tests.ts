function resizeTo(width) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

test('shows the window width after mounting', async () => {
  resizeTo(1024);
  const wrapper = mount(mod.default);
  await nextTick();
  expect(wrapper.get('.width').text()).toBe('Width: 1024px');
});

test('updates when the window is resized', async () => {
  resizeTo(1024);
  const wrapper = mount(mod.default);
  resizeTo(640);
  await nextTick();
  expect(wrapper.get('.width').text()).toBe('Width: 640px');
});

test('removes the same resize listener on unmount', () => {
  const added = [];
  const removed = [];
  const originalAdd = window.addEventListener;
  const originalRemove = window.removeEventListener;
  window.addEventListener = function (type, listener, options) {
    if (type === 'resize') added.push(listener);
    return originalAdd.call(this, type, listener, options);
  };
  window.removeEventListener = function (type, listener, options) {
    if (type === 'resize') removed.push(listener);
    return originalRemove.call(this, type, listener, options);
  };
  try {
    const wrapper = mount(mod.default);
    expect(added).toHaveLength(1);
    wrapper.unmount();
    expect(removed).toContain(added[0]);
  } finally {
    window.addEventListener = originalAdd;
    window.removeEventListener = originalRemove;
  }
});

test('stops updating after unmount', async () => {
  resizeTo(1024);
  const { h, ref } = require('vue');
  const visible = ref(true);
  const Host = { setup: () => () => (visible.value ? h(mod.default) : h('span', 'gone')) };
  const wrapper = mount(Host);
  visible.value = false;
  await nextTick();
  resizeTo(500);
  await nextTick();
  expect(wrapper.text()).toBe('gone');
  expect(source).toMatch(/on(Before)?Unmount(ed)?\s*\(/);
});
