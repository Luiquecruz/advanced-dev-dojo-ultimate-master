const baseClasses = ['inline-flex', 'items-center', 'rounded-full', 'px-2.5', 'py-0.5', 'text-xs', 'font-medium'];

test('StatusBadge always has the base classes and renders its children', () => {
  const { StatusBadge } = mod;
  render(<StatusBadge status="success">Live</StatusBadge>);
  expect(screen.getByText('Live').tagName).toBe('SPAN');
  expect(screen.getByText('Live')).toHaveClass(...baseClasses);
});

test('success badge uses green tones with dark variants', () => {
  const { StatusBadge } = mod;
  render(<StatusBadge status="success">Live</StatusBadge>);
  expect(screen.getByText('Live')).toHaveClass('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
});

test('warning and error badges use yellow and red tones', () => {
  const { StatusBadge } = mod;
  render(
    <div>
      <StatusBadge status="warning">Queued</StatusBadge>
      <StatusBadge status="error">Failed</StatusBadge>
    </div>,
  );
  expect(screen.getByText('Queued')).toHaveClass('bg-yellow-100', 'text-yellow-800', 'dark:bg-yellow-900', 'dark:text-yellow-200', ...baseClasses);
  expect(screen.getByText('Failed')).toHaveClass('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200', ...baseClasses);
  expect(screen.getByText('Failed')).not.toHaveClass('bg-green-100');
});

test('Card has responsive padding and a styled <h3> title', () => {
  const { Card } = mod;
  render(<Card title="Deployments">Body</Card>);
  const heading = screen.getByRole('heading', { level: 3, name: 'Deployments' });
  expect(heading).toHaveClass('text-lg', 'font-semibold');
  const article = screen.getByRole('article');
  expect(article).toHaveClass('rounded-xl', 'border', 'border-gray-200', 'p-4', 'shadow-sm', 'md:p-6');
  expect(article).toHaveTextContent('Body');
});

test('does not build Tailwind class names dynamically', () => {
  expect(source).not.toMatch(/[a-z]-\$\{/);
});
