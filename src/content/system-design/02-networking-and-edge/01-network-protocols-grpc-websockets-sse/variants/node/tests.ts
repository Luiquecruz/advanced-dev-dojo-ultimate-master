test('formatting an event writes id, event, retry and data lines in order and ends with an empty line', () => {
  expect(mod.formatEvent({ id: '7', event: 'price', retry: 5000, data: '{"cents":1999}' })).toBe('id: 7\nevent: price\nretry: 5000\ndata: {"cents":1999}\n\n');
  expect(mod.formatEvent({ data: 'hello' })).toBe('data: hello\n\n');
  expect(mod.formatEvent({ data: '' })).toBe('data: \n\n');
  expect(() => mod.formatEvent({ id: '1\n2', data: 'x' })).toThrow('id and event must not contain line breaks');
  expect(() => mod.formatEvent({ event: 'a\nb', data: 'x' })).toThrow('id and event must not contain line breaks');
});

// beginner mistake: writing multi-line data in a single data line, which ends the field at the first line break
test('formatting an event writes one data line per line of data', () => {
  expect(mod.formatEvent({ data: 'line one\nline two\nline three' })).toBe('data: line one\ndata: line two\ndata: line three\n\n');
});

test('parsing a stream joins data lines with a line break, defaults the type to message and ignores comments', () => {
  const stream = ': connected\n\ndata: first\ndata:  indented\n\nevent: price\ndata:no space\n\n';
  expect(mod.parseEvents(stream)).toEqual([
    { event: 'message', data: 'first\n indented', lastEventId: '' },
    { event: 'price', data: 'no space', lastEventId: '' },
  ]);
});

test('parsing a stream keeps the last event id, skips empty events (clearing their type), ignores unknown fields and drops an unfinished event', () => {
  const stream = 'id: 41\ndata: a\n\nretry: 3000\nfoo: bar\n\ndata: b\n\nid: 43\ndata\n\nevent: lost\n\ndata: c\n\ndata: unfinished\n';
  expect(mod.parseEvents(stream)).toEqual([
    { event: 'message', data: 'a', lastEventId: '41' },
    { event: 'message', data: 'b', lastEventId: '41' },
    { event: 'message', data: '', lastEventId: '43' },
    { event: 'message', data: 'c', lastEventId: '43' },
  ]);
});

test('parsing reads back what formatting writes', () => {
  const messages = [
    { id: '1', event: 'order', data: '{"id":1}' },
    { id: '2', data: 'multi\nline' },
    { event: 'ping', retry: 1000, data: '' },
  ];
  const stream = messages.map((message) => mod.formatEvent(message)).join('');
  expect(mod.parseEvents(stream)).toEqual([
    { event: 'order', data: '{"id":1}', lastEventId: '1' },
    { event: 'message', data: 'multi\nline', lastEventId: '2' },
    { event: 'ping', data: '', lastEventId: '2' },
  ]);
});
