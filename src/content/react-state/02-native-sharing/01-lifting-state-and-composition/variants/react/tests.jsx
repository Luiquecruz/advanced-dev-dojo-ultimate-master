test('typing filters the orders and selecting one shows the summary', async () => {
  const Dashboard = mod.default;
  render(<Dashboard onChartRender={fn()} />);
  expect(screen.getByTestId('selection')).toHaveTextContent('No order selected');
  await user.type(screen.getByLabelText('Search orders'), 'mo');
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Monitor', 'Mouse']);
  await user.click(screen.getByRole('button', { name: 'Mouse' }));
  expect(screen.getByTestId('selection')).toHaveTextContent('Selected: Mouse (North)');
});

test('typing in the search box does not re-render SalesChart', async () => {
  const Dashboard = mod.default;
  const onChartRender = fn();
  render(<Dashboard onChartRender={onChartRender} />);
  expect(onChartRender).toHaveBeenCalledTimes(1);
  await user.type(screen.getByLabelText('Search orders'), 'key');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(onChartRender).toHaveBeenCalledTimes(1);
});

test('selecting an order does not re-render SalesChart', async () => {
  const Dashboard = mod.default;
  const onChartRender = fn();
  render(<Dashboard onChartRender={onChartRender} />);
  await user.click(screen.getByRole('button', { name: 'Monitor' }));
  expect(screen.getByTestId('selection')).toHaveTextContent('Selected: Monitor (South)');
  expect(onChartRender).toHaveBeenCalledTimes(1);
});

test('changing the accent restyles the frame without re-rendering SalesChart', async () => {
  const Dashboard = mod.default;
  const onChartRender = fn();
  render(<Dashboard onChartRender={onChartRender} />);
  await user.selectOptions(screen.getByLabelText('Accent'), 'teal');
  expect(screen.getByTestId('frame')).toHaveClass('frame-teal');
  expect(within(screen.getByTestId('frame')).getByRole('figure', { name: 'Sales chart' })).toBeInTheDocument();
  expect(onChartRender).toHaveBeenCalledTimes(1);
});

test('the fix is structural: no memo, useMemo or useCallback', () => {
  expect(source).not.toMatch(/\bmemo\s*\(|useMemo|useCallback/);
  expect(source).toMatch(/children/);
});
