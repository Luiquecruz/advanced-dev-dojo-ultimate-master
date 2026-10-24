test('renders the title in an <h3>, the children, and variant "info" by default', () => {
  const { Card } = mod;
  const { container } = render(
    <Card title="Hello">
      <span>Body</span>
    </Card>,
  );
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Hello');
  expect(screen.getByText('Body')).toBeInTheDocument();
  expect(container.querySelector('article')).toHaveAttribute('data-variant', 'info');
});

test('renders the subtitle and variant only when provided', () => {
  const { Card } = mod;
  const { container, rerender } = render(<Card title="A">x</Card>);
  expect(container.querySelector('article p')).toBeNull();
  rerender(
    <Card title="A" subtitle="Sub" variant="warning">
      x
    </Card>,
  );
  expect(container.querySelector('article p')).toHaveTextContent('Sub');
  expect(container.querySelector('article')).toHaveAttribute('data-variant', 'warning');
});

test('renders a Close button only when onClose is passed, and calls it', async () => {
  const { Card } = mod;
  const onClose = fn();
  const { rerender } = render(<Card title="A">x</Card>);
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  rerender(
    <Card title="A" onClose={onClose}>
      x
    </Card>,
  );
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('declares CardProps with the required members', () => {
  expect(source).toMatch(/(interface\s+CardProps|type\s+CardProps\s*=)/);
  expect(source).toMatch(/title\s*:\s*string/);
  expect(source).toMatch(/subtitle\?\s*:\s*string/);
  expect(source).toMatch(/variant\?\s*:/);
  expect(source).toMatch(/['"](info|warning)['"]\s*\|\s*['"](info|warning)['"]/);
  expect(source).toMatch(/onClose\?\s*:\s*\(\s*\)\s*=>\s*void/);
  expect(source).toMatch(/children\s*:\s*(React\.)?ReactNode/);
});

test('annotates the props with CardProps and uses no any', () => {
  expect(source).toMatch(/\}\s*:\s*CardProps\s*\)|props\s*:\s*CardProps/);
  expect(source).not.toMatch(/:\s*any\b|as\s+any\b|<any>/);
});
