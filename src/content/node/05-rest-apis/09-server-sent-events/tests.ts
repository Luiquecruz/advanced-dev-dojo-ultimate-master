const parseEvents = (text: string) =>
  text
    .split('\n\n')
    .filter((block) => block.trim() !== '')
    .map((block) => Object.fromEntries(block.split('\n').map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 2)])));

test('formatSSE writes the event, data and id lines followed by a blank line', () => {
  expect(mod.formatSSE({ event: 'progress', id: '1', data: '{"percent":50}' })).toBe('event: progress\ndata: {"percent":50}\nid: 1\n\n');
  expect(mod.formatSSE({ data: 'hello' })).toBe('data: hello\n\n');
  expect(mod.formatSSE({ event: 'note', data: 'line one\nline two' })).toBe('event: note\ndata: line one\ndata: line two\n\n');
});

test('GET /jobs/:id/events streams every progress event and a final done event', async () => {
  const app = mod.createApp({ wait: async () => {}, intervalMs: 10 });
  const response = await request(app, '/jobs/report-1/events');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/text\/event-stream/);
  expect(parseEvents(response.text)).toEqual([
    { event: 'progress', data: '{"percent":25}', id: '0' },
    { event: 'progress', data: '{"percent":50}', id: '1' },
    { event: 'progress', data: '{"percent":75}', id: '2' },
    { event: 'progress', data: '{"percent":100}', id: '3' },
    { event: 'done', data: '{"jobId":"report-1"}' },
  ]);
});

test('waits intervalMs after each progress event using the injected wait', async () => {
  const wait = fn(async () => {});
  const app = mod.createApp({ wait, intervalMs: 250 });
  await request(app, '/jobs/export-7/events');
  expect(wait).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledWith(250);
});

test('Last-Event-ID resumes after the last received event', async () => {
  const app = mod.createApp({ wait: async () => {}, intervalMs: 10 });
  const response = await request(app, '/jobs/report-1/events', { headers: { 'Last-Event-ID': '1' } });
  expect(parseEvents(response.text).map((event: any) => event.id ?? event.event)).toEqual(['2', '3', 'done']);
});

test('unknown jobs answer 404 JSON before any stream starts', async () => {
  const app = mod.createApp({ wait: async () => {}, intervalMs: 10 });
  const response = await request(app, '/jobs/nope/events');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ error: 'Job not found' });
  expect(source).toMatch(/streamSSE\(/);
});
