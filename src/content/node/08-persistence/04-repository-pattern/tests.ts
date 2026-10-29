const ada = { email: 'ada@example.com', name: 'Ada Lovelace', role: 'admin' };
const alan = { email: 'alan@example.com', name: 'Alan Turing', role: 'member' };

test('create assigns ids from 1 and findById / findByEmail return the user or null', async () => {
  const repository = new mod.InMemoryUserRepository();
  expect(await repository.create(ada)).toEqual({ id: 1, ...ada });
  expect(await repository.create(alan)).toEqual({ id: 2, ...alan });
  expect(await repository.findById(2)).toEqual({ id: 2, ...alan });
  expect(await repository.findByEmail('ADA@example.com')).toEqual({ id: 1, ...ada });
  expect(await repository.findById(99)).toBeNull();
  expect(await repository.findByEmail('nobody@example.com')).toBeNull();
});

test('returned users are copies: mutating them does not change the stored rows', async () => {
  const repository = new mod.InMemoryUserRepository();
  const created = await repository.create({ ...ada });
  created.role = 'member';
  const found = await repository.findById(1);
  found.name = 'Changed';
  (await repository.list())[0].email = 'changed@example.com';
  expect(await repository.findById(1)).toEqual({ id: 1, ...ada });
});

test('emails are unique ignoring case on create and update (DuplicateEmailError)', async () => {
  const repository = new mod.InMemoryUserRepository();
  await repository.create(ada);
  await repository.create(alan);
  await expect(repository.create({ ...alan, email: 'ADA@example.com' })).rejects.toThrow('Email already in use: ADA@example.com');
  await expect(repository.create({ ...alan, email: 'ADA@example.com' })).rejects.toBeInstanceOf(mod.DuplicateEmailError);
  await expect(repository.update(2, { email: 'ada@example.com' })).rejects.toBeInstanceOf(mod.DuplicateEmailError);
  expect(await repository.update(1, { email: 'ADA@example.com' })).toEqual({ id: 1, ...ada, email: 'ADA@example.com' });
});

test('update merges a patch and delete removes the row; both report unknown ids', async () => {
  const repository = new mod.InMemoryUserRepository();
  await repository.create(alan);
  expect(await repository.update(1, { role: 'admin' })).toEqual({ id: 1, ...alan, role: 'admin' });
  expect(await repository.update(42, { role: 'admin' })).toBeNull();
  expect(await repository.delete(1)).toBe(true);
  expect(await repository.delete(1)).toBe(false);
  expect(await repository.findById(1)).toBeNull();
});

test('list returns users in id order with offset and limit (defaults 0 and 50)', async () => {
  const repository = new mod.InMemoryUserRepository();
  for (let index = 1; index <= 60; index++) {
    await repository.create({ email: `user${index}@example.com`, name: `User ${index}`, role: 'member' });
  }
  await repository.delete(3);
  const firstPage = await repository.list();
  expect(firstPage).toHaveLength(50);
  expect(firstPage.slice(0, 3).map((user: any) => user.id)).toEqual([1, 2, 4]);
  expect((await repository.list({ offset: 2, limit: 3 })).map((user: any) => user.id)).toEqual([4, 5, 6]);
});

test('createUserService works with any UserRepository implementation', async () => {
  const fake = {
    findById: fn(), findByEmail: fn(), list: fn(), delete: fn(),
    create: fn(async (input: any) => ({ id: 7, ...input })),
    update: fn(async (id: number, patch: any) => (id === 7 ? { id, ...alan, ...patch } : null)),
  };
  const service = mod.createUserService(fake);
  expect(await service.register({ email: '  Alan@Example.COM ', name: ' Alan Turing ' })).toEqual({ id: 7, email: 'alan@example.com', name: 'Alan Turing', role: 'member' });
  expect(fake.create).toHaveBeenCalledWith({ email: 'alan@example.com', name: 'Alan Turing', role: 'member' });
  expect((await service.promoteToAdmin(7)).role).toBe('admin');
  expect(fake.update).toHaveBeenCalledWith(7, { role: 'admin' });
  await expect(service.promoteToAdmin(8)).rejects.toThrow('User not found');
});
