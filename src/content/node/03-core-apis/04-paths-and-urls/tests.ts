test('resolveSafe() returns absolute paths inside the root', () => {
  expect(mod.resolveSafe('/srv/public', 'css/site.css')).toBe('/srv/public/css/site.css');
  expect(mod.resolveSafe('/srv/public', 'img/../logo.svg')).toBe('/srv/public/logo.svg');
  expect(mod.resolveSafe('/srv/public', '.')).toBe('/srv/public');
});

test('resolveSafe() throws "Path escapes root" for traversal, absolute paths and sibling folders', () => {
  expect(() => mod.resolveSafe('/srv/public', '../secret.txt')).toThrow('Path escapes root');
  expect(() => mod.resolveSafe('/srv/public', 'a/../../etc/passwd')).toThrow('Path escapes root');
  expect(() => mod.resolveSafe('/srv/public', '/etc/passwd')).toThrow('Path escapes root');
  expect(() => mod.resolveSafe('/srv/public', '../public-backup/db.sql')).toThrow('Path escapes root');
});

test('buildUrl() appends the path to the base and encodes the query, skipping undefined', () => {
  expect(mod.buildUrl('https://api.example.com/v1', 'users', { q: 'ada lovelace', page: 2, role: undefined })).toBe('https://api.example.com/v1/users?q=ada+lovelace&page=2');
  expect(mod.buildUrl('https://api.example.com/v1/', 'search', { q: 'a&b=c#d' })).toBe('https://api.example.com/v1/search?q=a%26b%3Dc%23d');
  expect(mod.buildUrl('https://api.example.com', 'health', {})).toBe('https://api.example.com/health');
});

test('staticFilePath() decodes the pathname, ignores the query and serves index.html for folders', () => {
  expect(mod.staticFilePath('/srv/public', '/docs/?v=1')).toBe('/srv/public/docs/index.html');
  expect(mod.staticFilePath('/srv/public', '/')).toBe('/srv/public/index.html');
  expect(mod.staticFilePath('/srv/public', '/img/logo%20dark.png')).toBe('/srv/public/img/logo dark.png');
});

test('staticFilePath() blocks encoded traversal like /..%2f..%2fetc%2fpasswd', () => {
  expect(() => mod.staticFilePath('/srv/public', '/..%2f..%2fetc%2fpasswd')).toThrow('Path escapes root');
  expect(() => mod.staticFilePath('/srv/public', '/assets/..%2F..%2F..%2Fapp%2F.env')).toThrow('Path escapes root');
});

test('contentType() maps extensions case-insensitively with a binary fallback', () => {
  expect(mod.contentType('/srv/public/index.html')).toBe('text/html; charset=utf-8');
  expect(mod.contentType('/srv/public/logo.PNG')).toBe('image/png');
  expect(mod.contentType('/srv/public/app.js')).toBe('text/javascript');
  expect(mod.contentType('/srv/public/archive.tar.gz')).toBe('application/octet-stream');
  expect(mod.contentType('/srv/public/Makefile')).toBe('application/octet-stream');
});
