test('GET /health answers the text "ok"', async () => {
  const response = await request(mod.app, '/health');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/text\/plain/);
  expect(response.text).toBe('ok');
});

test('GET /books returns every book as JSON with X-Total-Count', async () => {
  const response = await request(mod.app, '/books');
  expect(response.status).toBe(200);
  expect(response.body).toEqual(mod.books);
  expect(response.headers['x-total-count']).toBe('4');
});

test('GET /books filters by ?author= case-insensitively and caps with ?limit=', async () => {
  const byAuthor = await request(mod.app, '/books?author=MARTIN');
  expect(byAuthor.body.map((book: any) => book.id)).toEqual([3, 4]);
  expect(byAuthor.headers['x-total-count']).toBe('2');
  const limited = await request(mod.app, '/books?limit=3');
  expect(limited.body.map((book: any) => book.id)).toEqual([1, 2, 3]);
  const both = await request(mod.app, '/books?author=martin&limit=1');
  expect(both.body.map((book: any) => book.id)).toEqual([3]);
});

test('GET /books/:id returns the book, 404 { error: "Book not found" } for unknown ids and ignores non-numeric ids', async () => {
  const found = await request(mod.app, '/books/2');
  expect(found.status).toBe(200);
  expect(found.body).toEqual({ id: 2, title: 'Node.js Design Patterns', author: 'Mario Casciaro' });
  const missing = await request(mod.app, '/books/99');
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: 'Book not found' });
  const invalid = await request(mod.app, '/books/abc');
  expect(invalid.status).toBe(404);
  expect(invalid.text).not.toContain('Book not found');
});

test('POST /books answers 201 with the created book and stores it', async () => {
  const created = await request(mod.app, '/books', { method: 'POST', body: { title: 'Clean Code', author: 'Robert C. Martin' } });
  expect(created.status).toBe(201);
  expect(created.body).toEqual({ id: 5, title: 'Clean Code', author: 'Robert C. Martin' });
  expect((await request(mod.app, '/books/5')).body).toEqual(created.body);
});
