function sendOverTheNetwork(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function findClientReferences(payload, found = []) {
  if (Array.isArray(payload)) {
    payload.forEach((item) => findClientReferences(item, found));
  } else if (payload !== null && typeof payload === 'object') {
    if ('$client' in payload) {
      found.push(payload);
    }
    Object.values(payload).forEach((value) => findClientReferences(value, found));
  }
  return found;
}

test('server components run on the server: their data is in the payload, their private fields are not', async () => {
  const payload = await mod.renderToPayload(<mod.ProductPage productId={7} />);
  const json = JSON.stringify(payload);
  expect(sendOverTheNetwork(payload)).toEqual(payload);
  expect(json).toContain('Mechanical Keyboard');
  expect(json).toContain('Hot-swappable switches');
  expect(json).not.toContain('costPrice');
  expect(json).not.toContain('61');
});

test('client components become { $client, props } references and are not executed on the server', async () => {
  const LikeButton = mod.markAsClient('LikeButton', fn(() => <button type="button">Like</button>));
  const payload = await mod.renderToPayload(
    <section>
      <h2>Community</h2>
      <LikeButton postId={3} tags={['new']} />
    </section>,
  );
  expect(LikeButton).not.toHaveBeenCalled();
  expect(findClientReferences(payload)).toEqual([expect.objectContaining({ $client: 'LikeButton', props: { postId: 3, tags: ['new'] } })]);
});

test('renderFromPayload rebuilds the page on the client and the client components are interactive', async () => {
  const payload = sendOverTheNetwork(await mod.renderToPayload(<mod.ProductPage productId={7} />));
  render(mod.renderFromPayload(payload, mod.clientComponents));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mechanical Keyboard');
  await user.click(screen.getByRole('button', { name: 'Add to cart (0)' }));
  await user.click(screen.getByRole('button', { name: 'Add to cart (1)' }));
  expect(screen.getByRole('button', { name: 'Add to cart (2)' })).toBeInTheDocument();
  expect(screen.getByText('Total: $240')).toBeInTheDocument();
});

test('a function prop passed to a client component is rejected', async () => {
  const LikeButton = mod.markAsClient('LikeButton', () => <button type="button">Like</button>);
  await expect(mod.renderToPayload(<LikeButton onLike={() => undefined} />)).rejects.toThrow('Functions cannot be passed directly to Client Components');
});

test('a server component passed as children of a client component renders on the server and fills the slot', async () => {
  const ServerReviews = fn(async () => (
    <ul>
      <li>Great feel</li>
      <li>A bit loud</li>
    </ul>
  ));
  const payload = sendOverTheNetwork(
    await mod.renderToPayload(
      <mod.Tabs label="Reviews">
        <ServerReviews />
      </mod.Tabs>,
    ),
  );
  expect(ServerReviews).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(payload)).toContain('Great feel');
  render(mod.renderFromPayload(payload, mod.clientComponents));
  expect(screen.queryByText('Great feel')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show Reviews' }));
  expect(within(screen.getByRole('region', { name: 'Reviews' })).getByText('Great feel')).toBeInTheDocument();
  expect(ServerReviews).toHaveBeenCalledTimes(1);
});

test('a client reference missing from the client components throws with its name', async () => {
  const payload = sendOverTheNetwork(await mod.renderToPayload(<mod.ProductPage productId={7} />));
  expect(() => mod.renderFromPayload(payload, { AddToCart: mod.AddToCart })).toThrow('Tabs');
});
