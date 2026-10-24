test('GREETING is an InjectionToken with the default value "Hello"', () => {
  const { InjectionToken } = require('@angular/core');
  const { GREETING } = modules['tokens.ts'];
  expect(GREETING).toBeInstanceOf(InjectionToken);
  expect(TestBed.inject(GREETING)).toBe('Hello');
});

test('renders "Hello, Ada!" in an <h1> using the default token value', async () => {
  await render(mod.Greeter);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello, Ada!');
});

test('a { provide: GREETING, useValue } provider overrides the heading', async () => {
  const { GREETING } = modules['tokens.ts'];
  await render(mod.Greeter, { providers: [{ provide: GREETING, useValue: 'Howdy' }] });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Howdy, Ada!');
});

test('Logger resolves to a MemoryLogger provided by the component itself', async () => {
  const { Logger, MemoryLogger } = modules['tokens.ts'];
  const { fixture } = await render(mod.Greeter);
  const logger = fixture.debugElement.injector.get(Logger);
  expect(logger).toBeInstanceOf(MemoryLogger);
  expect(TestBed.inject(Logger, null)).toBeNull();
});

test('clicking "Greet" logs "Greeted Ada"', async () => {
  const { Logger } = modules['tokens.ts'];
  const { fixture } = await render(mod.Greeter);
  await user.click(screen.getByRole('button', { name: 'Greet' }));
  expect(fixture.debugElement.injector.get(Logger).messages).toEqual(['Greeted Ada']);
});
