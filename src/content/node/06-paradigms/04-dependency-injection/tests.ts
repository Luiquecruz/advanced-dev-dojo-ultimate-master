const fixedClock = { now: () => new Date('2026-01-02T03:04:05Z') };
const fakes = () => ({
  users: new mod.InMemoryUserRepository(),
  mailer: { send: fn(async () => undefined) },
  clock: fixedClock,
  ids: () => 'user-1',
});

test('signup normalizes the email and builds the user from the injected ids and clock', async () => {
  const deps = fakes();
  const service = new mod.SignupService(deps);
  const user = await service.signup('  Ada@Example.com ');
  expect(user).toEqual({ id: 'user-1', email: 'ada@example.com', createdAt: '2026-01-02T03:04:05.000Z' });
  expect(await deps.users.findByEmail('ada@example.com')).toEqual(user);
});

test('signup sends the welcome email through the injected mailer', async () => {
  const deps = fakes();
  await new mod.SignupService(deps).signup('grace@example.com');
  expect(deps.mailer.send).toHaveBeenCalledTimes(1);
  expect(deps.mailer.send).toHaveBeenCalledWith({ to: 'grace@example.com', subject: 'Welcome to Dev Dojo' });
});

test('a taken email rejects with EmailTakenError and nothing is saved or sent', async () => {
  const deps = fakes();
  await deps.users.save({ id: 'old', email: 'ada@example.com', createdAt: '2025-01-01T00:00:00.000Z' });
  const save = fn(async () => undefined);
  const service = new mod.SignupService({ ...deps, users: { findByEmail: deps.users.findByEmail.bind(deps.users), save } });
  const error = await service.signup('ADA@example.com').catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(mod.EmailTakenError);
  expect(error.message).toBe('Email already registered: ada@example.com');
  expect(save).not.toHaveBeenCalled();
  expect(deps.mailer.send).not.toHaveBeenCalled();
});

test('createContainer() wires the real defaults', async () => {
  const logs = captureLogs();
  const container = mod.createContainer();
  const user = await container.signupService.signup('linus@example.com');
  expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(Number.isNaN(Date.parse(user.createdAt))).toBe(false);
  expect(await container.users.findByEmail('linus@example.com')).toEqual(user);
  expect(logs).toContain('Sending "Welcome to Dev Dojo" to linus@example.com');
});

test('createContainer(overrides) swaps only the overridden dependencies', async () => {
  const logs = captureLogs();
  const container = mod.createContainer({ clock: fixedClock, ids: () => 'fixed-id' });
  const user = await container.signupService.signup('margaret@example.com');
  expect(user).toEqual({ id: 'fixed-id', email: 'margaret@example.com', createdAt: '2026-01-02T03:04:05.000Z' });
  expect(container.mailer).toBe(mod.consoleMailer);
  expect(logs).toContain('Sending "Welcome to Dev Dojo" to margaret@example.com');
});

test('SignupService creates none of its collaborators', () => {
  const classSource = /class\s+SignupService[\s\S]*?\n}/.exec(source)?.[0] ?? '';
  expect(classSource).toMatch(/constructor\s*\(/);
  expect(classSource).not.toMatch(/new\s+Date|randomUUID|new\s+InMemoryUserRepository|console\./);
});
