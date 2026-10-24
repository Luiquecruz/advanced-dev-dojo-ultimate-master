const ORDERS = [
  { id: 1, amount: 120 },
  { id: 2, amount: 45 },
];

test('shows the order count and total', () => {
  const Dashboard = mod.default;
  render(<Dashboard orders={ORDERS} />);
  expect(screen.getByText('2 orders')).toBeInTheDocument();
  expect(screen.getByText('Total: $165')).toBeInTheDocument();
});

test('toggling the theme does NOT recompute the stats', async () => {
  const Dashboard = mod.default;
  const computeStats = fn(mod.summarizeOrders);
  render(<Dashboard orders={ORDERS} computeStats={computeStats} />);
  expect(computeStats).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Dark mode' }));
  await user.click(screen.getByRole('button', { name: 'Light mode' }));
  expect(computeStats).toHaveBeenCalledTimes(1);
});

test('toggling the theme does NOT re-render the memoized Chart', async () => {
  const Dashboard = mod.default;
  const onChartRender = fn();
  render(<Dashboard orders={ORDERS} onChartRender={onChartRender} />);
  await user.click(screen.getByRole('button', { name: 'Dark mode' }));
  expect(screen.getByRole('main')).toHaveClass('dark');
  expect(onChartRender).toHaveBeenCalledTimes(1);
});

test('new orders recompute the stats and update the chart', () => {
  const Dashboard = mod.default;
  const computeStats = fn(mod.summarizeOrders);
  const { rerender } = render(<Dashboard orders={ORDERS} computeStats={computeStats} />);
  rerender(<Dashboard orders={[...ORDERS, { id: 3, amount: 35 }]} computeStats={computeStats} />);
  expect(computeStats).toHaveBeenCalledTimes(2);
  expect(screen.getByText('3 orders')).toBeInTheDocument();
  expect(screen.getByText('Total: $200')).toBeInTheDocument();
});

test('uses useMemo', () => {
  expect(source).toMatch(/useMemo\s*\(/);
});
