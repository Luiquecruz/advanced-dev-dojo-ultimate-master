const databaseUrl = 'postgres://app:s3cret@db.internal:5432/shop';

test('parses and coerces a valid environment', () => {
  const config = mod.loadConfig({
    NODE_ENV: 'test',
    PORT: '8080',
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: 'debug',
    ENABLE_SIGNUP: 'yes',
    ALLOWED_ORIGINS: ' https://app.example.com, https://admin.example.com ,',
  });
  expect(config).toEqual({
    NODE_ENV: 'test',
    PORT: 8080,
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: 'debug',
    ENABLE_SIGNUP: true,
    ALLOWED_ORIGINS: ['https://app.example.com', 'https://admin.example.com'],
  });
  expect(mod.loadConfig({ DATABASE_URL: databaseUrl, ENABLE_SIGNUP: 'false' }).ENABLE_SIGNUP).toBe(false);
});

test('applies the defaults when only DATABASE_URL is set', () => {
  expect(mod.loadConfig({ DATABASE_URL: databaseUrl })).toEqual({
    NODE_ENV: 'development',
    PORT: 3000,
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: 'info',
    ENABLE_SIGNUP: false,
    ALLOWED_ORIGINS: [],
  });
});

test('throws a ConfigError listing every invalid variable without leaking values', () => {
  let error: any;
  try {
    mod.loadConfig({ PORT: '99999', DATABASE_URL: 'hunter2-is-the-password', ENABLE_SIGNUP: 'maybe', LOG_LEVEL: 'verbose' });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(mod.ConfigError);
  expect(error).toBeInstanceOf(Error);
  expect(error.issues.map((issue: any) => issue.variable).sort()).toEqual(['DATABASE_URL', 'ENABLE_SIGNUP', 'LOG_LEVEL', 'PORT']);
  error.issues.forEach((issue: any) => expect(issue.message).toEqual(expect.any(String)));
  expect(error.message).toMatch(/^Invalid environment: /);
  ['PORT', 'DATABASE_URL', 'ENABLE_SIGNUP', 'LOG_LEVEL'].forEach((name) => expect(error.message).toContain(name));
  expect(error.message).not.toContain('hunter2');
  expect(error.message).not.toContain('maybe');
});

test('requires a SESSION_SECRET of at least 32 characters in production', () => {
  let error: any;
  try {
    mod.loadConfig({ NODE_ENV: 'production', DATABASE_URL: databaseUrl });
  } catch (caught) {
    error = caught;
  }
  expect(error?.issues).toEqual([{ variable: 'SESSION_SECRET', message: 'Required in production' }]);
  expect(() => mod.loadConfig({ NODE_ENV: 'production', DATABASE_URL: databaseUrl, SESSION_SECRET: 'too-short' })).toThrow(/SESSION_SECRET/);
  const secret = 'x'.repeat(32);
  expect(mod.loadConfig({ NODE_ENV: 'production', DATABASE_URL: databaseUrl, SESSION_SECRET: secret }).SESSION_SECRET).toBe(secret);
});

test('reads process.env by default and returns a frozen object', () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.PORT = '4000';
  const config = mod.loadConfig();
  expect(config.PORT).toBe(4000);
  expect(Object.isFrozen(config)).toBe(true);
});
