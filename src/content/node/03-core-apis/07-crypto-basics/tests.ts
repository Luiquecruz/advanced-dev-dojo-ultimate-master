const crypto = require('node:crypto');

test('sha256Hex() returns the SHA-256 digest in hex', () => {
  expect(mod.sha256Hex('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  expect(mod.sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('signWebhook() returns "sha256=" + the hex HMAC-SHA256 of the body', () => {
  const body = '{"event":"order.paid"}';
  expect(mod.signWebhook(body, 'whsec_test')).toBe(`sha256=${crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex')}`);
  expect(mod.signWebhook(body, 'other')).not.toBe(mod.signWebhook(body, 'whsec_test'));
});

test('verifyWebhook() accepts a valid signature and rejects a tampered body or a wrong secret', () => {
  const body = '{"event":"order.paid","amount":30}';
  const header = `sha256=${crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex')}`;
  expect(mod.verifyWebhook(body, header, 'whsec_test')).toBe(true);
  expect(mod.verifyWebhook(body.replace('30', '3000'), header, 'whsec_test')).toBe(false);
  expect(mod.verifyWebhook(body, header, 'whsec_wrong')).toBe(false);
});

test('verifyWebhook() returns false without throwing for missing or wrong-length headers, using timingSafeEqual', () => {
  expect(mod.verifyWebhook('{}', undefined, 'whsec_test')).toBe(false);
  expect(mod.verifyWebhook('{}', 'sha256=abc', 'whsec_test')).toBe(false);
  expect(mod.verifyWebhook('{}', '', 'whsec_test')).toBe(false);
  expect(source).toMatch(/timingSafeEqual\s*\(/);
});

test('createId() returns <prefix>_ + 24 random hex characters without Math.random', () => {
  const ids = Array.from({ length: 50 }, () => mod.createId('ord'));
  ids.forEach((id: string) => expect(id).toMatch(/^ord_[0-9a-f]{24}$/));
  expect(new Set(ids).size).toBe(50);
  expect(source).not.toMatch(/Math\.random/);
});
