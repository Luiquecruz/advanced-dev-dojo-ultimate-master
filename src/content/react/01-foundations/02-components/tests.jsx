test('exports Avatar as a named component that renders the image', () => {
  expect(typeof mod.Avatar).toBe('function');
  const Avatar = mod.Avatar;
  render(<Avatar />);
  const image = screen.getByRole('img', { name: 'Katherine Johnson' });
  expect(image).toHaveClass('avatar');
  expect(image).toHaveAttribute('src', '/avatars/katherine.png');
});

test('exports Profile as a named component with an avatar and an <h3>', () => {
  expect(typeof mod.Profile).toBe('function');
  const Profile = mod.Profile;
  const { container } = render(<Profile />);
  expect(container.querySelector('article img.avatar')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Katherine Johnson');
});

test('TeamPage renders the "Our Team" heading', () => {
  const TeamPage = mod.default;
  render(<TeamPage />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Our Team');
});

test('TeamPage renders two profiles, each with a real <img>', () => {
  const TeamPage = mod.default;
  const { container } = render(<TeamPage />);
  expect(container.querySelectorAll('section > article')).toHaveLength(2);
  expect(screen.getAllByRole('img', { name: 'Katherine Johnson' })).toHaveLength(2);
  expect(container.querySelector('avatar')).toBeNull();
});

test('does not declare components inside TeamPage', () => {
  const body = source.slice(source.search(/function\s+TeamPage/) + 'function TeamPage'.length);
  expect(body).not.toMatch(/function\s+[A-Z]\w*\s*\(|const\s+[A-Z]\w*\s*=\s*\(/);
});
