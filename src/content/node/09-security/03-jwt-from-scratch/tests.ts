const SECRET = 'your-256-bit-secret';
const JWT_IO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function forge(header: object, payload: object, signature = '') {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode(header)}.${encode(payload)}.${signature}`;
}

test('base64UrlEncode / base64UrlDecode use the URL-safe alphabet without padding', () => {
  expect(mod.base64UrlEncode(Buffer.from([0xfb, 0xff]))).toBe('-_8');
  expect(mod.base64UrlEncode('{"alg":"HS256","typ":"JWT"}')).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  expect([...mod.base64UrlDecode('-_8')]).toEqual([0xfb, 0xff]);
  expect(mod.base64UrlDecode('eyJzdWIiOiIxIn0').toString('utf8')).toBe('{"sub":"1"}');
});

test('sign produces the reference HS256 token from jwt.io', () => {
  const token = mod.sign({ sub: '1234567890', name: 'John Doe' }, SECRET, { now: () => 1516239022000 });
  expect(token).toBe(JWT_IO_TOKEN);
});

test('tokens interoperate with hono/jwt in both directions', async () => {
  const honoJwt = require('hono/jwt');
  const ours = mod.sign({ sub: '42', role: 'admin' }, SECRET);
  expect(await honoJwt.verify(ours, SECRET, 'HS256')).toEqual(expect.objectContaining({ sub: '42', role: 'admin' }));
  const theirs = await honoJwt.sign({ sub: '7', role: 'member' }, SECRET, 'HS256');
  expect(mod.verify(theirs, SECRET)).toEqual({ sub: '7', role: 'member' });
});

test('exp is iat + expiresInSeconds and verify throws "Token expired" from that second on', () => {
  const token = mod.sign({ sub: '42' }, SECRET, { expiresInSeconds: 60, now: () => 1_700_000_000_500 });
  expect(mod.verify(token, SECRET, { now: () => 1_700_000_059_999 })).toEqual({ sub: '42', iat: 1_700_000_000, exp: 1_700_000_060 });
  expect(() => mod.verify(token, SECRET, { now: () => 1_700_000_060_000 })).toThrow('Token expired');
});

test('a wrong secret, a changed payload or a changed signature throw JwtError "Invalid signature"', () => {
  const [header, , signature] = JWT_IO_TOKEN.split('.');
  const promoted = forge({ alg: 'HS256', typ: 'JWT' }, { sub: '1234567890', name: 'John Doe', admin: true }).slice(0, -1);
  for (const [token, secret] of [
    [JWT_IO_TOKEN, 'another-secret'],
    [`${promoted.split('.')[0]}.${promoted.split('.')[1]}.${signature}`, SECRET],
    [`${JWT_IO_TOKEN.slice(0, -1)}d`, SECRET],
    [`${header}.${JWT_IO_TOKEN.split('.')[1]}.short`, SECRET],
  ]) {
    expect(() => mod.verify(token, secret)).toThrow('Invalid signature');
  }
  let caught: unknown;
  try {
    mod.verify(JWT_IO_TOKEN, 'another-secret');
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(mod.JwtError);
});

test('alg "none" is rejected as "Unsupported algorithm" and broken tokens as "Malformed token"', () => {
  expect(() => mod.verify(forge({ alg: 'none', typ: 'JWT' }, { sub: '1', admin: true }), SECRET)).toThrow('Unsupported algorithm');
  expect(() => mod.verify(forge({ alg: 'HS512', typ: 'JWT' }, { sub: '1' }, 'abc'), SECRET)).toThrow('Unsupported algorithm');
  for (const token of ['', 'abc', 'a.b', 'a.b.c.d', 'not-json.eyJzdWIiOiIxIn0.sig']) {
    expect(() => mod.verify(token, SECRET)).toThrow('Malformed token');
  }
});
