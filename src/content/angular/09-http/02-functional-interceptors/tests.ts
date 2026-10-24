const { HttpClient, HttpContext } = require('@angular/common/http');
const { provideHttpClientTesting, HttpTestingController } = require('@angular/common/http/testing');

function setup(token: string | null) {
  TestBed.configureTestingModule({ providers: [...mod.appConfig.providers, provideHttpClientTesting()] });
  TestBed.inject(mod.AuthStore).token.set(token);
  return { client: TestBed.inject(HttpClient), http: TestBed.inject(HttpTestingController) };
}

test('adds "Authorization: Bearer <token>" when the user has a token', () => {
  const { client, http } = setup('abc123');
  client.get('/api/users').subscribe();
  const request = http.expectOne('/api/users');
  expect(request.request.headers.get('Authorization')).toBe('Bearer abc123');
});

test('sends no Authorization header without a token', () => {
  const { client, http } = setup(null);
  client.get('/api/users').subscribe();
  expect(http.expectOne('/api/users').request.headers.has('Authorization')).toBe(false);
});

test('skips the header when the request sets the SKIP_AUTH context token', () => {
  const { client, http } = setup('abc123');
  client.get('/api/posts', { context: new HttpContext().set(mod.SKIP_AUTH, true) }).subscribe();
  expect(http.expectOne('/api/posts').request.headers.has('Authorization')).toBe(false);
});

test('logs successful responses with method, url and status', () => {
  const { client, http } = setup(null);
  client.get('/api/posts', { params: { userId: 2 } }).subscribe();
  http.expectOne('/api/posts?userId=2').flush([]);
  expect(TestBed.inject(mod.RequestLog).entries()).toEqual(['GET /api/posts?userId=2 200']);
});

test('logs failed requests with their error status', () => {
  const { client, http } = setup(null);
  client.delete('/api/todos/1').subscribe({ error: () => undefined });
  http.expectOne('/api/todos/1').flush({ error: 'Nope' }, { status: 403, statusText: 'Forbidden' });
  expect(TestBed.inject(mod.RequestLog).entries()).toEqual(['DELETE /api/todos/1 403']);
});

test('registers functional interceptors with withInterceptors()', () => {
  expect(source).toMatch(/withInterceptors\(\s*\[\s*authInterceptor\s*,\s*loggingInterceptor\s*\]/);
  expect(source).not.toMatch(/HTTP_INTERCEPTORS/);
});
