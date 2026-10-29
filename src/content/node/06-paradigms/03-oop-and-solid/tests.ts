const message = { to: 'ada@example.com', body: 'Your order shipped' };

test('EmailNotifier delivers the body unchanged on the email channel', async () => {
  const transport = fn(async () => undefined);
  const notifier = new mod.EmailNotifier(transport);
  expect(notifier.channel).toBe('email');
  await notifier.send(message);
  expect(transport).toHaveBeenCalledWith({ channel: 'email', to: 'ada@example.com', text: 'Your order shipped' });
});

test('SmsNotifier keeps short bodies and cuts long ones to 157 characters plus "..."', async () => {
  const transport = fn(async () => undefined);
  const notifier = new mod.SmsNotifier(transport);
  expect(notifier.channel).toBe('sms');
  await notifier.send({ to: '+1555', body: 'x'.repeat(160) });
  expect(transport.mock.calls[0][0]).toEqual({ channel: 'sms', to: '+1555', text: 'x'.repeat(160) });
  await notifier.send({ to: '+1555', body: 'y'.repeat(200) });
  const text = transport.mock.calls[1][0].text;
  expect(text).toHaveLength(160);
  expect(text).toBe(`${'y'.repeat(157)}...`);
});

test('NotificationService routes each message to the notifier of its channel', async () => {
  const transport = fn(async () => undefined);
  const service = new mod.NotificationService([new mod.EmailNotifier(transport), new mod.SmsNotifier(transport)]);
  expect(service.channels()).toEqual(['email', 'sms']);
  await service.notify('sms', message);
  await service.notify('email', message);
  expect(transport.mock.calls.map((call: any) => call[0].channel)).toEqual(['sms', 'email']);
});

test('a new channel plugs in without changing NotificationService (open/closed)', async () => {
  const push = { channel: 'push', send: fn(async () => undefined) };
  const service = new mod.NotificationService([push]);
  await service.notify('push', message);
  expect(push.send).toHaveBeenCalledWith(message);
  const serviceSource = /class\s+NotificationService[\s\S]*?\n}/.exec(source)?.[0] ?? '';
  expect(serviceSource).not.toMatch(/['"`](email|sms)['"`]/);
});

test('unknown channels reject and duplicate channels are refused', async () => {
  const transport = fn(async () => undefined);
  const service = new mod.NotificationService([new mod.EmailNotifier(transport)]);
  await expect(service.notify('fax', message)).rejects.toThrow('Unsupported channel: fax');
  expect(() => new mod.NotificationService([new mod.EmailNotifier(transport), new mod.EmailNotifier(transport)])).toThrow('Duplicate notifier for channel: email');
});
