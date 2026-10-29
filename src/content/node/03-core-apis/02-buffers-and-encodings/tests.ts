test('byteLength() counts UTF-8 bytes, not characters', () => {
  expect(mod.byteLength('hello')).toBe(5);
  expect(mod.byteLength('héllo')).toBe(6);
  expect(mod.byteLength('👋')).toBe(4);
  expect(mod.byteLength('')).toBe(0);
});

test('encodeBasicAuth() returns "Basic " + base64("user:password")', () => {
  expect(mod.encodeBasicAuth('ada', 'secret')).toBe('Basic YWRhOnNlY3JldA==');
  expect(mod.encodeBasicAuth('josé', 'ñ')).toBe(`Basic ${Buffer.from('josé:ñ').toString('base64')}`);
});

test('decodeBasicAuth() splits on the first ":" and returns null for other schemes or malformed values', () => {
  expect(mod.decodeBasicAuth(`Basic ${Buffer.from('ada:pa:ss').toString('base64')}`)).toEqual({ user: 'ada', password: 'pa:ss' });
  expect(mod.decodeBasicAuth(`basic ${Buffer.from('josé:ñ').toString('base64')}`)).toEqual({ user: 'josé', password: 'ñ' });
  expect(mod.decodeBasicAuth('Bearer abc.def')).toBeNull();
  expect(mod.decodeBasicAuth(`Basic ${Buffer.from('no-colon').toString('base64')}`)).toBeNull();
});

test('truncateBytes() keeps whole characters within the byte budget', () => {
  expect(mod.truncateBytes('abc', 10)).toBe('abc');
  expect(mod.truncateBytes('héllo', 2)).toBe('h');
  expect(mod.truncateBytes('héllo', 3)).toBe('hé');
  expect(mod.truncateBytes('👋👋', 5)).toBe('👋');
  expect(mod.truncateBytes('👋', 3)).toBe('');
});

test('decodeChunks() decodes a character split across chunks', () => {
  const bytes = Buffer.from('€ 5 – naïve');
  expect(mod.decodeChunks([bytes.subarray(0, 2), bytes.subarray(2, 9), bytes.subarray(9)])).toBe('€ 5 – naïve');
  expect(mod.decodeChunks([])).toBe('');
});
