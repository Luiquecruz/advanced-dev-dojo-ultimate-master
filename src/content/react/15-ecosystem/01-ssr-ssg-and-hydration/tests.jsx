function serverRender(count) {
  const container = document.createElement('div');
  container.innerHTML = mod.renderApp(count);
  document.body.append(container);
  return container;
}

test('renderApp returns an HTML string with the heading and the initial count', () => {
  const html = mod.renderApp(3);
  expect(typeof html).toBe('string');
  expect(html).toMatch(/<h1>Server rendered counter<\/h1>/);
  const container = serverRender(3);
  expect(within(container).getByRole('button').textContent).toBe('Count: 3');
});

test('the server HTML is not interactive before hydration', async () => {
  const container = serverRender(2);
  await user.click(within(container).getByRole('button'));
  expect(within(container).getByRole('button').textContent).toBe('Count: 2');
});

test('hydrateApp makes the server HTML interactive and reuses the same DOM nodes', async () => {
  const container = serverRender(3);
  const serverButton = within(container).getByRole('button');
  let root;
  await act(async () => {
    root = mod.hydrateApp(container, 3);
  });
  await user.click(serverButton);
  expect(serverButton.textContent).toBe('Count: 4');
  expect(within(container).getByRole('button')).toBe(serverButton);
  act(() => root.unmount());
});

test('hydration logs no mismatch errors and the label stays linked to its input', async () => {
  const container = serverRender(1);
  const original = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.map(String).join(' '));
  let root;
  try {
    await act(async () => {
      root = mod.hydrateApp(container, 1);
    });
  } finally {
    console.error = original;
  }
  expect(errors.filter((message) => /hydrat|did(n't| not) match/i.test(message))).toEqual([]);
  expect(within(container).getByLabelText('Step')).toHaveAttribute('type', 'number');
  act(() => root.unmount());
});

test('uses renderToString on the server and hydrateRoot on the client', () => {
  expect(source).toMatch(/renderToString\s*\(/);
  expect(source).toMatch(/hydrateRoot\s*\(/);
});
