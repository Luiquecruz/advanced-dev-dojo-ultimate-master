test('Avatar renders the image with the given name and url', () => {
  const Avatar = mod.Avatar;
  render(<Avatar name="Alan Turing" imageUrl="/avatars/alan.png" size={40} />);
  const image = screen.getByRole('img', { name: 'Alan Turing' });
  expect(image).toHaveAttribute('src', '/avatars/alan.png');
  expect(image).toHaveAttribute('width', '40');
  expect(image).toHaveAttribute('height', '40');
});

test('Avatar size defaults to 64 when not passed', () => {
  const Avatar = mod.Avatar;
  render(<Avatar name="Alan Turing" imageUrl="/avatars/alan.png" />);
  const image = screen.getByRole('img', { name: 'Alan Turing' });
  expect(image).toHaveAttribute('width', '64');
  expect(image).toHaveAttribute('height', '64');
});

test('Profile renders a 96px avatar, the name in an <h3> and the role in a <p>', () => {
  const Profile = mod.Profile;
  const { container } = render(<Profile name="Linus Torvalds" role="Engineer" imageUrl="/avatars/linus.png" />);
  const image = screen.getByRole('img', { name: 'Linus Torvalds' });
  expect(image).toHaveAttribute('src', '/avatars/linus.png');
  expect(image).toHaveAttribute('width', '96');
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Linus Torvalds');
  expect(container.querySelector('article p')).toHaveTextContent('Engineer');
});

test('TeamPage renders Ada Lovelace and Grace Hopper', () => {
  const TeamPage = mod.default;
  const { container } = render(<TeamPage />);
  const headings = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
  expect(headings).toEqual(['Ada Lovelace', 'Grace Hopper']);
  expect(screen.getByRole('img', { name: 'Grace Hopper' })).toHaveAttribute('src', '/avatars/grace.png');
  expect(container.textContent).toContain('Mathematician');
  expect(container.textContent).toContain('Computer Scientist');
});

test('uses a destructuring default instead of defaultProps', () => {
  expect(source).toMatch(/size\s*=\s*64/);
  expect(source).not.toMatch(/defaultProps/);
});
