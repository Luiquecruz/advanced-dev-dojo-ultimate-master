const { resolveSharedScope, satisfies } = mod;

function react(version, requiredVersion, options = {}) {
  return { react: { version, requiredVersion, singleton: true, ...options } };
}

test('satisfies supports exact versions, ^, ~, >= and *', () => {
  expect(satisfies('19.1.0', '19.1.0')).toBe(true);
  expect(satisfies('19.1.1', '19.1.0')).toBe(false);
  expect(satisfies('19.4.2', '^19.1.0')).toBe(true);
  expect(satisfies('19.0.9', '^19.1.0')).toBe(false);
  expect(satisfies('20.0.0', '^19.1.0')).toBe(false);
  expect(satisfies('0.2.5', '^0.2.1')).toBe(true);
  expect(satisfies('0.3.0', '^0.2.1')).toBe(false);
  expect(satisfies('0.0.4', '^0.0.3')).toBe(false);
  expect(satisfies('7.4.9', '~7.4.2')).toBe(true);
  expect(satisfies('7.5.0', '~7.4.2')).toBe(false);
  expect(satisfies('7.4.1', '~7.4.2')).toBe(false);
  expect(satisfies('20.3.0', '>=18.2.0')).toBe(true);
  expect(satisfies('18.1.9', '>=18.2.0')).toBe(false);
  expect(satisfies('1.0.0', '*')).toBe(true);
});

test('a non-singleton module loads one copy: the highest version every range accepts', () => {
  const result = resolveSharedScope([
    { name: 'shell', shared: { 'date-fns': { version: '3.3.1', requiredVersion: '^3.0.0' } } },
    { name: 'checkout', shared: { 'date-fns': { version: '3.6.0', requiredVersion: '^3.2.0' } } },
    { name: 'profile', shared: { 'date-fns': { version: '3.6.0', requiredVersion: '>=3.1.0' } } },
  ]);
  expect(result.selected['date-fns']).toEqual({
    version: '3.6.0',
    from: 'checkout',
    loaded: ['3.6.0'],
    consumers: { shell: '3.6.0', checkout: '3.6.0', profile: '3.6.0' },
  });
  expect(result.warnings).toEqual([]);
  expect(result.errors).toEqual([]);
});

test('a non-singleton module falls back to the consumer\'s own version when the highest one is out of range', () => {
  const result = resolveSharedScope([
    { name: 'shell', shared: { 'date-fns': { version: '3.6.0', requiredVersion: '^3.0.0' } } },
    { name: 'checkout', shared: { 'date-fns': { version: '4.1.0', requiredVersion: '^4.0.0' } } },
    { name: 'profile', shared: { 'date-fns': { version: '2.30.0', requiredVersion: '~2.30.0' } } },
  ]);
  expect(result.selected['date-fns']).toEqual({
    version: '4.1.0',
    from: 'checkout',
    loaded: ['4.1.0', '3.6.0', '2.30.0'],
    consumers: { shell: '3.6.0', checkout: '4.1.0', profile: '2.30.0' },
  });
  expect(result.warnings).toEqual([]);
});

test('a singleton uses the highest provided version and warns consumers whose range rejects it', () => {
  const result = resolveSharedScope([
    { name: 'shell', shared: react('19.0.0', '^19.0.0') },
    { name: 'checkout', shared: react('19.1.0', '^19.1.0') },
    { name: 'legacy-account', shared: react('18.3.1', '^18.2.0') },
  ]);
  expect(result.selected.react).toEqual({
    version: '19.1.0',
    from: 'checkout',
    loaded: ['19.1.0'],
    consumers: { shell: '19.1.0', checkout: '19.1.0', 'legacy-account': '19.1.0' },
  });
  expect(result.warnings).toEqual([
    { module: 'react', container: 'legacy-account', requiredVersion: '^18.2.0', version: '19.1.0' },
  ]);
  expect(result.errors).toEqual([]);
});

test('a singleton mismatch is an error for consumers with strictVersion', () => {
  const result = resolveSharedScope([
    { name: 'shell', shared: { ...react('19.1.0', '^19.0.0'), 'react-dom': { version: '19.1.0', requiredVersion: '^19.0.0', singleton: true } } },
    { name: 'legacy-account', shared: { ...react('18.3.1', '^18.2.0', { strictVersion: true }), 'react-dom': { version: '18.3.1', requiredVersion: '^18.2.0', singleton: true } } },
  ]);
  expect(result.errors).toEqual([
    { module: 'react', container: 'legacy-account', requiredVersion: '^18.2.0', version: '19.1.0' },
  ]);
  expect(result.warnings).toEqual([
    { module: 'react-dom', container: 'legacy-account', requiredVersion: '^18.2.0', version: '19.1.0' },
  ]);
  expect(result.selected['react-dom']).toEqual(expect.objectContaining({ version: '19.1.0', from: 'shell', loaded: ['19.1.0'] }));
});
