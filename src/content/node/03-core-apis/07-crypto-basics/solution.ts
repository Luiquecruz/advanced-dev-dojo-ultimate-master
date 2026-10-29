import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function signWebhook(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export function verifyWebhook(body: string, header: string | undefined, secret: string): boolean {
  if (header === undefined) {
    return false;
  }
  const expected = Buffer.from(signWebhook(body, secret));
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`;
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
