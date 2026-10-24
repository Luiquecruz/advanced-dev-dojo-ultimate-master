test('lists every product and "Showing 5 results" after loading', async () => {
  render(mod.default);
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(5));
  await waitFor(() => expect(screen.getByText('Showing 5 results')).toBeInTheDocument());
});

test('shows the matching products and the up-to-date count', async () => {
  render(mod.default);
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(5));
  await user.type(screen.getByLabelText('Search'), 'mo');
  await waitFor(() => expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Mouse', 'Monitor']));
  await waitFor(() => expect(screen.getByText('Showing 2 results')).toBeInTheDocument());
});

test('aborts superseded requests so only the latest query completes', async () => {
  const completed: string[] = [];
  mockApi('/api/products', ({ url }) => {
    completed.push(url.searchParams.get('q') ?? '');
    return [];
  });
  const wrapper = mount(mod.default);
  const input = wrapper.get('input');
  await input.setValue('m');
  await input.setValue('mo');
  await waitFor(() => expect(completed).toContain('mo'));
  await sleep(50);
  expect(completed).toEqual(['mo']);
});

test('aborts the pending request when the component unmounts', async () => {
  const completed: string[] = [];
  mockApi('/api/products', ({ url }) => {
    completed.push(url.searchParams.get('q') ?? '');
    return [];
  });
  const wrapper = mount(mod.default);
  wrapper.unmount();
  await sleep(100);
  expect(completed).toEqual([]);
});

test('uses onWatcherCleanup and flush: "post"', () => {
  expect(source).toMatch(/onWatcherCleanup\(/);
  expect(source).toMatch(/flush\s*:\s*['"]post['"]|watchPostEffect\(/);
});
