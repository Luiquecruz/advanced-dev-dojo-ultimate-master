test('does not render the chart before "Show chart" is clicked', () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Reports');
  expect(screen.queryByText('Sales chart')).toBeNull();
});

test('shows "Loading chart..." while the Chart code loads', () => {
  const App = mod.default;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Show chart' }));
  expect(screen.getByText('Loading chart...')).toBeInTheDocument();
});

test('renders the chart after it loads', async () => {
  const App = mod.default;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Show chart' }));
  expect(await screen.findByRole('heading', { name: 'Sales chart' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('loads Chart with lazy() and a dynamic import()', () => {
  expect(source).toMatch(/lazy\s*\(\s*(async\s*)?\(\s*\)\s*=>\s*import\s*\(\s*['"]\.\/Chart(\.jsx)?['"]\s*\)/);
  expect(source).not.toMatch(/import\s+Chart\s+from/);
});
