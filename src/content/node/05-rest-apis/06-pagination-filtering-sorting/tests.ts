const ids = (items: any[]) => items.map((item) => item.id);

test('GET /products returns the first 10 products with total, limit and offset by default', async () => {
  const response = await request(mod.app, '/products');
  expect(response.status).toBe(200);
  expect(ids(response.body.items)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(response.body).toEqual(expect.objectContaining({ total: 25, limit: 10, offset: 0 }));
});

test('GET /products applies offset, clamps limit to 50 and counts total after the category filter', async () => {
  expect(ids((await request(mod.app, '/products?limit=5&offset=20')).body.items)).toEqual([21, 22, 23, 24, 25]);
  const clamped = await request(mod.app, '/products?limit=500');
  expect(clamped.body.limit).toBe(50);
  expect(clamped.body.items).toHaveLength(25);
  const games = await request(mod.app, '/products?category=games&limit=3&offset=1');
  expect(games.body.total).toBe(8);
  expect(ids(games.body.items)).toEqual([5, 8, 11]);
});

test('GET /products sorts by whitelisted fields, without mutating products, and rejects invalid queries', async () => {
  const byPrice = [...mod.products].sort((a: any, b: any) => a.price - b.price);
  expect(ids((await request(mod.app, '/products?sort=price&limit=5')).body.items)).toEqual(ids(byPrice.slice(0, 5)));
  expect(ids((await request(mod.app, '/products?sort=-price&limit=5')).body.items)).toEqual(ids([...byPrice].reverse().slice(0, 5)));
  expect(ids((await request(mod.app, '/products?sort=-name&limit=2')).body.items)).toEqual([25, 24]);
  expect(ids(mod.products)).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
  for (const query of ['sort=password', 'limit=0', 'offset=-1', 'limit=abc']) {
    const invalid = await request(mod.app, `/products?${query}`);
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: 'Invalid query' });
  }
});

test('encodeCursor and decodeCursor round-trip and reject garbage', () => {
  expect(mod.encodeCursor(10)).toBe(Buffer.from('{"id":10}').toString('base64'));
  expect(mod.decodeCursor(mod.encodeCursor(17))).toBe(17);
  expect(mod.decodeCursor('not a cursor')).toBeNull();
  expect(mod.decodeCursor(Buffer.from('{"id":"7"}').toString('base64'))).toBeNull();
});

test('GET /products/feed walks every product once and ends with nextCursor null', async () => {
  const seen: number[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const query: string = cursor ? `limit=10&cursor=${encodeURIComponent(cursor)}` : 'limit=10';
    const page = await request(mod.app, `/products/feed?${query}`);
    expect(page.status).toBe(200);
    seen.push(...ids(page.body.items));
    cursor = page.body.nextCursor;
    pages++;
  } while (cursor && pages < 10);
  expect(pages).toBe(3);
  expect(seen).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
  const exact = await request(mod.app, `/products/feed?limit=5&cursor=${encodeURIComponent(mod.encodeCursor(20))}`);
  expect(exact.body.nextCursor).toBeNull();
});

test('the feed is stable when earlier products are deleted and rejects invalid cursors', async () => {
  const first = await request(mod.app, '/products/feed?limit=10');
  mod.products.splice(0, 3);
  const second = await request(mod.app, `/products/feed?limit=10&cursor=${encodeURIComponent(first.body.nextCursor)}`);
  expect(ids(second.body.items)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  const invalid = await request(mod.app, '/products/feed?cursor=nope');
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: 'Invalid cursor' });
});
