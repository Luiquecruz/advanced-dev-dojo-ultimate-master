test('ThemedButton uses the default "light" theme without a provider', () => {
  const { ThemedButton } = mod;
  render(<ThemedButton>Save</ThemedButton>);
  expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn', 'btn-light');
});

test('Toolbar buttons read the theme from the nearest ThemeContext provider', () => {
  const { ThemeContext, Toolbar } = mod;
  render(
    <ThemeContext value="dark">
      <Toolbar />
    </ThemeContext>,
  );
  expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-dark');
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('btn-dark');
});

test('a nested provider overrides the outer one', () => {
  const { ThemeContext, ThemedButton } = mod;
  render(
    <ThemeContext value="dark">
      <ThemedButton>Outer</ThemedButton>
      <ThemeContext value="light">
        <ThemedButton>Inner</ThemedButton>
      </ThemeContext>
    </ThemeContext>,
  );
  expect(screen.getByRole('button', { name: 'Outer' })).toHaveClass('btn-dark');
  expect(screen.getByRole('button', { name: 'Inner' })).toHaveClass('btn-light');
});

test('toggling "Dark mode" in App re-themes every button', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-light');
  await user.click(screen.getByRole('checkbox', { name: 'Dark mode' }));
  expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-dark');
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('btn-dark');
});

test('creates the context with createContext', () => {
  expect(source).toMatch(/createContext\s*\(\s*['"]light['"]\s*\)/);
});
