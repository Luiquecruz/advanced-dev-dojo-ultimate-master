test('shows "Loading posts…" and then the posts of the first author', async () => {
  render(mod.default);
  expect(screen.getByText('Loading posts…')).toBeInTheDocument();
  expect(await screen.findByText('Notes on the Analytical Engine')).toBeInTheDocument();
  expect(screen.queryByText('Loading posts…')).toBeNull();
});

test('fetches again when another author is selected', async () => {
  render(mod.default);
  await screen.findByText('Notes on the Analytical Engine');
  await user.selectOptions(screen.getByLabelText('Author'), '2');
  expect(await screen.findByText('Computing Machinery and Intelligence')).toBeInTheDocument();
  expect(screen.queryByText('Notes on the Analytical Engine')).toBeNull();
});

test('shows "No posts yet." for an author without posts', async () => {
  render(mod.default);
  await screen.findByText('Notes on the Analytical Engine');
  await user.selectOptions(screen.getByLabelText('Author'), '4');
  expect(await screen.findByText('No posts yet.')).toBeInTheDocument();
});

test('shows "Could not load posts." in a role="alert" element when the request fails', async () => {
  mockApi('/api/posts', () => jsonResponse({ error: 'boom' }, 500));
  render(mod.default);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load posts.');
});

test('aborts the slow previous request so its stale response never replaces the new one', async () => {
  const realFetch = globalThis.fetch;
  const signals: AbortSignal[] = [];
  globalThis.fetch = (input: any, init?: any) => {
    signals.push(init?.signal);
    if (!String(input).includes('userId=1')) {
      return realFetch(input, init);
    }
    return new Promise((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      setTimeout(() => resolve(realFetch(input)), 300);
    });
  };
  try {
    render(mod.default);
    await user.selectOptions(screen.getByLabelText('Author'), '2');
    await screen.findByText('Computing Machinery and Intelligence');
    expect(signals[0]?.aborted).toBe(true);
    await sleep(400);
    expect(screen.getByText('Computing Machinery and Intelligence')).toBeInTheDocument();
    expect(screen.queryByText('Notes on the Analytical Engine')).toBeNull();
  } finally {
    globalThis.fetch = realFetch;
  }
});
