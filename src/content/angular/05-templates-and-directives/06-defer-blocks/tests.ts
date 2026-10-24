const { DeferBlockBehavior, DeferBlockState } = require('@angular/core/testing');

async function manual() {
  TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
  const result = await render(mod.ProductPage);
  const blocks = await result.fixture.getDeferBlocks();
  return { ...result, blocks };
}

test('shows both placeholders before any trigger fires', async () => {
  const { blocks } = await manual();
  expect(blocks).toHaveLength(2);
  expect(screen.getByText('Reviews will load when you click.')).toBeInTheDocument();
  expect(screen.getByText('Recommendations coming soon')).toBeInTheDocument();
  expect(screen.queryByText('Great product!')).toBeNull();
});

test('the reviews block has a loading state', async () => {
  const { blocks } = await manual();
  await blocks[0].render(DeferBlockState.Loading);
  expect(screen.getByText('Loading reviews...')).toBeInTheDocument();
});

test('the reviews block renders <app-reviews> when complete', async () => {
  const { blocks, element } = await manual();
  await blocks[0].render(DeferBlockState.Complete);
  expect(element.querySelector('app-reviews')).toHaveTextContent('Great product!');
  expect(screen.getByText('Recommendations coming soon')).toBeInTheDocument();
});

test('the reviews block has an error state', async () => {
  const { blocks } = await manual();
  await blocks[0].render(DeferBlockState.Error);
  expect(screen.getByText('Could not load reviews.')).toBeInTheDocument();
});

test('clicking "Show reviews" loads reviews, recommendations load on idle', async () => {
  await render(mod.ProductPage);
  await waitFor(() => expect(screen.getByText('You may also like: Mouse')).toBeInTheDocument(), { timeout: 2000 });
  expect(screen.queryByText('Great product!')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show reviews' }));
  await waitFor(() => expect(screen.getByText('Great product!')).toBeInTheDocument(), { timeout: 2000 });
});

test('uses an interaction trigger with prefetch on idle', () => {
  expect(source).toMatch(/@defer\s*\(\s*on\s+interaction\(\s*reviewsTrigger\s*\)\s*;\s*prefetch\s+on\s+idle/);
});
