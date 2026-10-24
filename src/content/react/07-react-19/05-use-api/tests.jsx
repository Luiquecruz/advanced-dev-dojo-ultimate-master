const loadUser = (id) => fetch(`/api/users/${id}`).then((response) => response.json());

async function renderResolved(element, promise) {
  await act(async () => {
    render(element);
    await promise;
  });
}

test('shows "Loading user..." while the promise is pending', () => {
  const App = mod.default;
  render(<App userPromise={new Promise(() => {})} />);
  expect(screen.getByText('Loading user...')).toBeInTheDocument();
});

test('renders "Hello, {name}!" in an <h2> once the promise resolves', async () => {
  const App = mod.default;
  const userPromise = loadUser(1);
  await renderResolved(<App userPromise={userPromise} />, userPromise);
  expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Hello, Ada Lovelace!');
  expect(screen.queryByText('Loading user...')).toBeNull();
});

test('reads the theme from ThemeContext with use()', async () => {
  const App = mod.default;
  const userPromise = loadUser(3);
  await renderResolved(<App userPromise={userPromise} theme="dark" />, userPromise);
  const heading = await screen.findByRole('heading', { level: 2 });
  expect(heading).toHaveTextContent('Hello, Grace Hopper!');
  expect(heading).toHaveClass('greeting', 'dark');
});

test('returns early without suspending when hidden', () => {
  const App = mod.default;
  const { container } = render(<App userPromise={new Promise(() => {})} hidden />);
  expect(screen.queryByText('Loading user...')).toBeNull();
  expect(container.innerHTML).toBe('');
});

test('uses use() for both resources and never useContext', () => {
  expect(source).toMatch(/\buse\(\s*ThemeContext\s*\)/);
  expect(source).toMatch(/\buse\(\s*userPromise\s*\)/);
  expect(source).not.toMatch(/useContext/);
});
