const crypto = require('node:crypto');

function legacyHash(password: string, iterations: number) {
  const salt = Buffer.from('0123456789abcdef');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2_sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

test('hashPassword returns pbkdf2_sha256$1000$<salt>$<hash> with a fresh 16-byte salt every time', async () => {
  const first = await mod.hashPassword('s3cret!');
  const second = await mod.hashPassword('s3cret!');
  const [algorithm, iterations, salt, hash] = first.split('$');
  expect(first.split('$')).toHaveLength(4);
  expect([algorithm, iterations]).toEqual(['pbkdf2_sha256', '1000']);
  expect(Buffer.from(salt, 'base64')).toHaveLength(16);
  expect(Buffer.from(hash, 'base64')).toHaveLength(32);
  expect(second).not.toBe(first);
});

test('the hash is PBKDF2-SHA256 of the password with the decoded salt bytes', async () => {
  const [, , salt, hash] = (await mod.hashPassword('s3cret!')).split('$');
  const expected = crypto.pbkdf2Sync('s3cret!', Buffer.from(salt, 'base64'), 1000, 32, 'sha256').toString('base64');
  expect(hash).toBe(expected);
});

test('verifyPassword accepts the right password, rejects a wrong one and honours the stored iteration count', async () => {
  const stored = await mod.hashPassword('s3cret!');
  expect(await mod.verifyPassword('s3cret!', stored)).toBe(true);
  expect(await mod.verifyPassword('s3cret?', stored)).toBe(false);
  expect(await mod.verifyPassword('old password', legacyHash('old password', 500))).toBe(true);
  expect(await mod.verifyPassword('wrong', legacyHash('old password', 500))).toBe(false);
});

test('verifyPassword returns false instead of throwing for malformed stored values', async () => {
  const salt = Buffer.from('0123456789abcdef').toString('base64');
  for (const stored of ['', 'plaintext', `md5$1000$${salt}$abcd`, `pbkdf2_sha256$abc$${salt}$abcd`, `pbkdf2_sha256$1000$${salt}`, `pbkdf2_sha256$0$${salt}$abcd`]) {
    expect(await mod.verifyPassword('anything', stored)).toBe(false);
  }
});

test('needsRehash flags weaker hashes and login upgrades them after a successful check', async () => {
  const old = legacyHash('old password', 500);
  expect(mod.needsRehash(old)).toBe(true);
  expect(mod.needsRehash(await mod.hashPassword('x'))).toBe(false);
  expect(mod.needsRehash('5f4dcc3b5aa765d61d8327deb882cf99')).toBe(true);
  const users = new Map([['ada@example.com', old]]);
  expect(await mod.login(users, 'ada@example.com', 'wrong')).toBe(false);
  expect(users.get('ada@example.com')).toBe(old);
  expect(await mod.login(users, 'nobody@example.com', 'old password')).toBe(false);
  expect(await mod.login(users, 'ada@example.com', 'old password')).toBe(true);
  expect(users.get('ada@example.com')).toMatch(/^pbkdf2_sha256\$1000\$/);
  expect(await mod.verifyPassword('old password', users.get('ada@example.com'))).toBe(true);
});

test('hashes are compared with crypto.timingSafeEqual', () => {
  expect(source).toMatch(/timingSafeEqual\s*\(/);
  expect(source).toMatch(/pbkdf2(Sync)?\b/);
});
