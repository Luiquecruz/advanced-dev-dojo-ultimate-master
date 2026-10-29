test('sql numbers the placeholders $1, $2 and keeps the values out of the text', () => {
  const email = "ada@example.com' OR '1'='1";
  const query = mod.sql`SELECT * FROM users WHERE email = ${email} AND role = ${'admin'}`;
  expect(query).toEqual({ text: 'SELECT * FROM users WHERE email = $1 AND role = $2', values: [email, 'admin'] });
  expect(mod.sql`SELECT 1`).toEqual({ text: 'SELECT 1', values: [] });
});

test('assertIdentifier returns safe names and throws "Unsafe identifier: <name>" for anything else', () => {
  for (const name of ['users', 'created_at', '_internal', 'Order2']) {
    expect(mod.assertIdentifier(name)).toBe(name);
  }
  for (const name of ['users; DROP TABLE users', 'name--', '1column', 'first name', '"users"', '']) {
    expect(() => mod.assertIdentifier(name)).toThrow(`Unsafe identifier: ${name}`);
  }
});

test('buildSelect lists columns and turns where entries into parameterized conditions', () => {
  expect(mod.buildSelect('users')).toEqual({ text: 'SELECT * FROM users', values: [] });
  const query = mod.buildSelect('users', { columns: ['id', 'name'], where: { role: 'admin', name: "x' OR '1'='1" } });
  expect(query).toEqual({ text: 'SELECT id, name FROM users WHERE role = $1 AND name = $2', values: ['admin', "x' OR '1'='1"] });
});

test('null becomes IS NULL and arrays become = ANY($n) with the array as one value', () => {
  const query = mod.buildSelect('users', { where: { deleted_at: null, id: [1, 2, 3], role: 'admin' } });
  expect(query).toEqual({ text: 'SELECT * FROM users WHERE deleted_at IS NULL AND id = ANY($1) AND role = $2', values: [[1, 2, 3], 'admin'] });
});

test('ORDER BY accepts only ASC or DESC and LIMIT / OFFSET are parameters', () => {
  const query = mod.buildSelect('posts', { where: { user_id: 7 }, orderBy: { column: 'created_at', direction: 'DESC' }, limit: 20, offset: 40 });
  expect(query).toEqual({ text: 'SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', values: [7, 20, 40] });
  expect(mod.buildSelect('posts', { orderBy: { column: 'title' } }).text).toBe('SELECT * FROM posts ORDER BY title ASC');
  expect(() => mod.buildSelect('posts', { orderBy: { column: 'title', direction: 'DESC; DROP TABLE posts' } })).toThrow('Unsafe sort direction: DESC; DROP TABLE posts');
});

test('every identifier (table, columns, where keys, order column) is checked', () => {
  expect(() => mod.buildSelect('users; --')).toThrow('Unsafe identifier');
  expect(() => mod.buildSelect('users', { columns: ['id', 'password_hash FROM secrets --'] })).toThrow('Unsafe identifier');
  expect(() => mod.buildSelect('users', { where: { '1=1 OR id': 1 } })).toThrow('Unsafe identifier');
  expect(() => mod.buildSelect('users', { orderBy: { column: '(SELECT 1)' } })).toThrow('Unsafe identifier');
});
