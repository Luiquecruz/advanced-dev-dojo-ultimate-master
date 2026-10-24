const { Subject } = require('rxjs');

function ticks() {
  const subject = new Subject();
  return { subject, providers: [{ provide: mod.TICKS, useValue: subject.asObservable() }] };
}

test('AsyncTicker renders each value with the async pipe', async () => {
  const { subject, providers } = ticks();
  await render(mod.AsyncTicker, { providers });
  subject.next(7);
  await stable();
  expect(screen.getByText('Async: 7')).toBeInTheDocument();
  subject.next(8);
  await stable();
  expect(screen.getByText('Async: 8')).toBeInTheDocument();
});

test('AsyncTicker unsubscribes when destroyed', async () => {
  const { subject, providers } = ticks();
  const { fixture } = await render(mod.AsyncTicker, { providers });
  expect(subject.observed).toBe(true);
  fixture.destroy();
  expect(subject.observed).toBe(false);
});

test('ManualTicker stores emitted values in the latest signal', async () => {
  const { subject, providers } = ticks();
  await render(mod.ManualTicker, { providers });
  expect(screen.getByText('Manual: 0')).toBeInTheDocument();
  subject.next(3);
  await stable();
  expect(screen.getByText('Manual: 3')).toBeInTheDocument();
});

test('ManualTicker unsubscribes when destroyed', async () => {
  const { subject, providers } = ticks();
  const { fixture } = await render(mod.ManualTicker, { providers });
  expect(subject.observed).toBe(true);
  fixture.destroy();
  expect(subject.observed).toBe(false);
});

test('uses the async pipe and takeUntilDestroyed()', () => {
  expect(source).toMatch(/\|\s*async/);
  expect(source).toMatch(/takeUntilDestroyed\(\s*\)/);
});
