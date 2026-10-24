const { createMemoryRouter, RouterProvider } = require('react-router');

function renderAt(path) {
  const router = createMemoryRouter(mod.routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

test('postLoader returns the post and throws a 404 for unknown ids', async () => {
  const post = await mod.postLoader({ params: { postId: '3' } });
  expect(post).toHaveProperty('id', 3);
  expect(post).toHaveProperty('title', 'The first bug');
  const error = await mod.postLoader({ params: { postId: '999' } }).then(
    () => null,
    (thrown) => thrown,
  );
  expect(error).not.toBeNull();
  expect(error.status ?? error.init?.status).toBe(404);
});

test('"/posts" renders every post title from the loader as a link', async () => {
  renderAt('/posts');
  const links = await screen.findAllByRole('link');
  expect(links.map((link) => link.textContent)).toEqual([
    'Notes on the Analytical Engine',
    'Computing Machinery and Intelligence',
    'The first bug',
    'Apollo guidance',
  ]);
  expect(links[1]).toHaveAttribute('href', '/posts/2');
});

test('"/posts/2" renders the post title and body', async () => {
  renderAt('/posts/2');
  expect(await screen.findByRole('heading', { name: 'Computing Machinery and Intelligence' })).toBeInTheDocument();
  expect(screen.getByText('Can machines think?')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to posts' })).toHaveAttribute('href', '/posts');
});

test('shows "Loading..." while the next route loader runs', async () => {
  mockApi('/api/posts/3', async () => {
    await sleep(200);
    return { id: 3, userId: 3, title: 'The first bug', body: 'A moth was found in relay #70.' };
  });
  renderAt('/posts');
  await user.click(await screen.findByRole('link', { name: 'The first bug' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Loading...');
  expect(screen.getByRole('heading', { name: 'Posts' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'The first bug' })).toBeInTheDocument();
  expect(screen.queryByRole('status')).toBeNull();
});

test('renders "Post not found" from the errorElement for a missing post', async () => {
  renderAt('/posts/999');
  expect(await screen.findByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
});

test('reads data with useLoaderData instead of effects', () => {
  expect(source).toMatch(/useLoaderData\(\s*\)/);
  expect(source).not.toMatch(/useEffect/);
});
