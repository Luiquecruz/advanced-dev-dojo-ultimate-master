test('POST /notes answers 201 with the created note and GET /notes lists notes in order', () => {
  const api = mod.createNotesApi();
  const first = api.handle({ method: 'POST', path: '/notes', body: { text: 'Buy milk' } });
  expect(first).toEqual({ status: 201, body: { id: 1, text: 'Buy milk' } });
  api.handle({ method: 'POST', path: '/notes', body: { text: 'Call Ada' } });
  expect(api.handle({ method: 'GET', path: '/notes' })).toEqual({ status: 200, body: [{ id: 1, text: 'Buy milk' }, { id: 2, text: 'Call Ada' }] });
});

// beginner mistake: reporting an error as 200 with an error field instead of a 4xx status
test('POST /notes without a usable text answers 400 and creates nothing', () => {
  const api = mod.createNotesApi();
  for (const body of [undefined, {}, { text: 42 }, { text: '   ' }]) {
    expect(api.handle({ method: 'POST', path: '/notes', body })).toEqual({ status: 400, body: { error: 'text is required' } });
  }
  expect(api.handle({ method: 'GET', path: '/notes' }).body).toEqual([]);
});

test('GET and DELETE /notes/<id> find the note or answer 404', () => {
  const api = mod.createNotesApi();
  api.handle({ method: 'POST', path: '/notes', body: { text: 'Buy milk' } });
  expect(api.handle({ method: 'GET', path: '/notes/1' })).toEqual({ status: 200, body: { id: 1, text: 'Buy milk' } });
  expect(api.handle({ method: 'GET', path: '/notes/9' })).toEqual({ status: 404, body: { error: 'note not found' } });
  expect(api.handle({ method: 'DELETE', path: '/notes/1' })).toEqual({ status: 204 });
  expect(api.handle({ method: 'DELETE', path: '/notes/1' })).toEqual({ status: 404, body: { error: 'note not found' } });
});

test('a known path with the wrong method answers 405 and an unknown path 404', () => {
  const api = mod.createNotesApi();
  api.handle({ method: 'POST', path: '/notes', body: { text: 'Buy milk' } });
  expect(api.handle({ method: 'DELETE', path: '/notes' })).toEqual({ status: 405, body: { error: 'method not allowed' } });
  expect(api.handle({ method: 'PUT', path: '/notes/1' })).toEqual({ status: 405, body: { error: 'method not allowed' } });
  expect(api.handle({ method: 'GET', path: '/users' })).toEqual({ status: 404, body: { error: 'not found' } });
});
