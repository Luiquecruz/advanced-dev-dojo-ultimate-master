function serverPage() {
  const container = document.createElement('div');
  container.innerHTML = mod.renderPage();
  document.body.append(container);
  return container;
}

async function hydrate(container, components = mod.islandComponents) {
  let roots = [];
  await act(async () => {
    roots = mod.hydrateIslands(container, components);
  });
  return roots;
}

function unmountAll(roots) {
  act(() => roots.forEach((root) => root.unmount()));
}

test('renderPage wraps each server-rendered island in a data-island element with JSON data-props', () => {
  const container = serverPage();
  const islands = [...container.querySelectorAll('[data-island]')];
  expect(islands.map((island) => island.dataset.island)).toEqual(['Counter', 'Counter', 'Disclosure']);
  expect(JSON.parse(islands[0].dataset.props)).toEqual({ label: 'Likes', start: 3 });
  expect(JSON.parse(islands[2].dataset.props)).toEqual({ title: 'Shipping details', body: 'Ships in 2 days from Lisbon & Porto.' });
  expect(within(container).getByRole('button', { name: 'Likes: 3' })).toBeInTheDocument();
  expect(within(container).getByRole('button', { name: 'Shipping details' })).toHaveAttribute('aria-expanded', 'false');
});

test('hydrateIslands makes every island interactive and reuses the server DOM nodes', async () => {
  const container = serverPage();
  const likes = within(container).getByRole('button', { name: 'Likes: 3' });
  const shipping = within(container).getByRole('button', { name: 'Shipping details' });
  const roots = await hydrate(container);
  expect(roots).toHaveLength(3);

  await user.click(likes);
  await user.click(shipping);
  expect(likes).toHaveTextContent('Likes: 4');
  expect(within(container).getByRole('button', { name: 'Likes: 4' })).toBe(likes);
  expect(shipping).toHaveAttribute('aria-expanded', 'true');
  expect(within(container).getByText('Ships in 2 days from Lisbon & Porto.')).toBeInTheDocument();
  unmountAll(roots);
});

test('islands are independent: one island state never changes another', async () => {
  const container = serverPage();
  const roots = await hydrate(container);
  await user.click(within(container).getByRole('button', { name: 'Likes: 3' }));
  await user.click(within(container).getByRole('button', { name: 'Likes: 4' }));
  expect(within(container).getByRole('button', { name: 'Shares: 0' })).toBeInTheDocument();
  await user.click(within(container).getByRole('button', { name: 'Shares: 0' }));
  expect(within(container).getByRole('button', { name: 'Likes: 5' })).toBeInTheDocument();
  expect(within(container).getByRole('button', { name: 'Shares: 1' })).toBeInTheDocument();
  unmountAll(roots);
});

test('static HTML outside the islands keeps its nodes and is never touched', async () => {
  const container = serverPage();
  const staticNodes = [...container.querySelectorAll('h1, p.description, p.specifications, footer')];
  expect(staticNodes).toHaveLength(4);
  const mutatedOutsideIslands = [];
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      if (!element.closest('[data-island]')) {
        mutatedOutsideIslands.push(record);
      }
    });
  });
  observer.observe(container, { childList: true, subtree: true, characterData: true, attributes: true });

  const original = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.map(String).join(' '));
  let roots = [];
  try {
    roots = await hydrate(container);
    await user.click(within(container).getByRole('button', { name: 'Likes: 3' }));
    await user.click(within(container).getByRole('button', { name: 'Shipping details' }));
  } finally {
    console.error = original;
  }
  await sleep(0);
  observer.disconnect();

  expect(errors.filter((message) => /hydrat|did(n't| not) match/i.test(message))).toEqual([]);
  expect(mutatedOutsideIslands).toEqual([]);
  expect([...container.querySelectorAll('h1, p.description, p.specifications, footer')]).toEqual(staticNodes);
  unmountAll(roots);
});

test('an island without a matching component throws with its name and hydrates nothing', async () => {
  const container = serverPage();
  const likes = within(container).getByRole('button', { name: 'Likes: 3' });
  let error;
  await act(async () => {
    try {
      mod.hydrateIslands(container, { Counter: mod.Counter });
    } catch (caught) {
      error = caught;
    }
  });
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toContain('Disclosure');
  await user.click(likes);
  expect(likes).toHaveTextContent('Likes: 3');
});

test('renders islands with renderToString and attaches them with hydrateRoot', () => {
  expect(source).toMatch(/renderToString\s*\(/);
  expect(source).toMatch(/hydrateRoot\s*\(/);
});
