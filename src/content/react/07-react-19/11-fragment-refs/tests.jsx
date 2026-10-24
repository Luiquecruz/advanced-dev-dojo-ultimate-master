test('renders the buttons as direct children of the toolbar', () => {
  const Toolbar = mod.default;
  render(<Toolbar />);
  const toolbar = screen.getByRole('toolbar', { name: 'Formatting' });
  expect([...toolbar.children].map((child) => child.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON']);
});

test('clicking any button calls onPress with its label', async () => {
  const onPress = fn();
  const Toolbar = mod.default;
  render(<Toolbar onPress={onPress} />);
  await user.click(screen.getByRole('button', { name: 'Italic' }));
  await user.click(screen.getByRole('button', { name: 'Underline' }));
  expect(onPress.mock.calls).toEqual([['Italic'], ['Underline']]);
});

test('replaces the listener when onPress changes instead of stacking it', async () => {
  const first = fn();
  const second = fn();
  const Toolbar = mod.default;
  const { rerender } = render(<Toolbar onPress={first} />);
  rerender(<Toolbar onPress={second} />);
  await user.click(screen.getByRole('button', { name: 'Bold' }));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledWith('Bold');
});

test('autoFocus focuses the first button through the Fragment ref', () => {
  const Toolbar = mod.default;
  render(<Toolbar autoFocus />);
  expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus();
});

test('uses a Fragment ref with addEventListener', () => {
  expect(source).toMatch(/<Fragment\s+ref=/);
  expect(source).toMatch(/\.addEventListener\(\s*['"]click['"]/);
  expect(source).toMatch(/\.removeEventListener\(\s*['"]click['"]/);
});
