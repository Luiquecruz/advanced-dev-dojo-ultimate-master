test('marks only the active tab with the "active" class and keeps "tab"', () => {
  render(mod.default);
  const home = screen.getByRole('button', { name: 'Home' });
  expect(home).toHaveClass('tab');
  expect(home).toHaveClass('active');
  expect(screen.getByRole('button', { name: 'Profile' })).not.toHaveClass('active');
});

test('moves the "active" class when another tab is clicked', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Profile' }));
  expect(screen.getByRole('button', { name: 'Profile' })).toHaveClass('tab', 'active');
  expect(screen.getByRole('button', { name: 'Home' })).not.toHaveClass('active');
});

test('applies alert-<level> and dismissible to the alert', async () => {
  render(mod.default);
  const alert = screen.getByRole('status');
  expect(alert).toHaveClass('alert', 'alert-warning', 'dismissible');
  await user.click(screen.getByRole('button', { name: 'Make it an error' }));
  await user.click(screen.getByRole('button', { name: 'Pin alert' }));
  expect(alert).toHaveClass('alert', 'alert-error');
  expect(alert).not.toHaveClass('alert-warning');
  expect(alert).not.toHaveClass('dismissible');
});

test('binds the bar width and color to progress', async () => {
  render(mod.default);
  const bar = screen.getByTestId('bar');
  expect(bar.style.width).toBe('40%');
  expect(bar.style.backgroundColor).toBe('orange');
  await user.click(screen.getByRole('button', { name: '+30' }));
  expect(bar.style.width).toBe('70%');
  await user.click(screen.getByRole('button', { name: '+30' }));
  expect(bar.style.width).toBe('100%');
  expect(bar.style.backgroundColor).toBe('green');
});

test('uses the object syntax for tabs and the array syntax for the alert', () => {
  expect(source).toMatch(/:class\s*=\s*"\s*\{\s*active\s*:/);
  expect(source).toMatch(/:class\s*=\s*"\s*\[/);
});
