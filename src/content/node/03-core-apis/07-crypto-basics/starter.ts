import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256Hex(text: string): string {
  // TODO: SHA-256 digest in hex
  return '';
}

export function signWebhook(body: string, secret: string): string {
  // TODO: 'sha256=' + hex HMAC-SHA256 of body with secret
  return '';
}

export function verifyWebhook(body: string, header: string | undefined, secret: string): boolean {
  // TODO: compare the expected signature with the header using timingSafeEqual, after a length check
  return header === signWebhook(body, secret);
}

export function createId(prefix: string): string {
  // TODO: prefix + '_' + 12 random bytes in hex
  return `${prefix}_${Math.random().toString(16).slice(2)}`;
}

function main() {
  const body = JSON.stringify({ event: 'order.paid', id: createId('evt') });
  const header = signWebhook(body, 'whsec_dev');
  console.log(body);
  console.log(header);
  console.log('valid:', verifyWebhook(body, header, 'whsec_dev'));
  console.log('tampered:', verifyWebhook(body.replace('paid', 'refunded'), header, 'whsec_dev'));
  console.log('etag:', sha256Hex(body).slice(0, 16));
}

main();
