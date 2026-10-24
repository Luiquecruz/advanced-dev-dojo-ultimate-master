test('Badge is exported as the default export', () => {
  expect(typeof mod.default).toBe('function');
});

test('renders an <h2> with the text "React Dojo"', () => {
  const Badge = mod.default;
  render(<Badge />);
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('React Dojo');
});

test('renders a <p> with class "level" showing "Level 1"', () => {
  const Badge = mod.default;
  const { container } = render(<Badge />);
  const paragraph = container.querySelector('p.level');
  expect(paragraph).toBeInTheDocument();
  expect(paragraph.textContent.replace(/\s+/g, ' ').trim()).toBe('Level 1');
});

test('uses the level constant inside a JSX expression', () => {
  expect(source).toMatch(/\{\s*level\s*\}/);
});

test('wraps everything in a single <section>', () => {
  const Badge = mod.default;
  const { container } = render(<Badge />);
  expect(container.firstElementChild.tagName).toBe('SECTION');
  expect(container.children).toHaveLength(1);
});
