const { provideHttpClient } = require('@angular/common/http');
const { provideRouter, UrlTree } = require('@angular/router');
const { RouterTestingHarness } = require('@angular/router/testing');
const { firstValueFrom, isObservable, of } = require('rxjs');

const runGuard = async (url: string) => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  const result = TestBed.runInInjectionContext(() => mod.authGuard({}, { url }));
  return isObservable(result) ? firstValueFrom(result) : result;
};

test('authGuard lets the request through when GET /api/me answers 200', async () => {
  mockApi('/api/me', { username: 'ada', roles: ['ADMIN'] });
  expect(await runGuard('/courses')).toBe(true);
});

test('authGuard sends 401 to /login with the attempted URL and 403 to /forbidden', async () => {
  mockApi('/api/me', () => jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
  const unauthorized = await runGuard('/courses');
  expect(unauthorized).toBeInstanceOf(UrlTree);
  expect(unauthorized.toString()).toBe('/login?returnUrl=%2Fcourses');
  mockApi('/api/me', () => jsonResponse({ title: 'Forbidden', status: 403 }, 403));
  const forbidden = await runGuard('/courses');
  expect(forbidden).toBeInstanceOf(UrlTree);
  expect(forbidden.toString()).toBe('/forbidden');
});

// beginner mistake: treating every failed call as "logged out" and redirecting to /login, which hides a server outage behind a login screen
test('authGuard reports server errors and network failures as /unavailable, not /login', async () => {
  mockApi('/api/me', () => jsonResponse({ title: 'Service Unavailable', status: 503 }, 503));
  expect((await runGuard('/courses')).toString()).toBe('/unavailable');
  mockApi('/api/me', () => {
    throw new TypeError('Failed to fetch');
  });
  expect((await runGuard('/courses')).toString()).toBe('/unavailable');
});

test('the courses route is protected: a visitor with a session sees it, one without is sent to the login page', async () => {
  mockApi('/api/me', { username: 'ada', roles: [] });
  TestBed.configureTestingModule({ providers: mod.appConfig.providers });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/courses');
  expect(screen.getByRole('heading', { name: 'Courses' })).toBeInTheDocument();
  mockApi('/api/me', () => jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
  await harness.navigateByUrl('/forbidden');
  await harness.navigateByUrl('/courses');
  expect(TestBed.inject(require('@angular/router').Router).url).toBe('/login?returnUrl=%2Fcourses');
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
});

test('isCrossOrigin() compares scheme, host and port, and treats relative URLs as same-origin', () => {
  const page = 'http://localhost:4200';
  expect(mod.isCrossOrigin('/api/courses', page)).toBe(false);
  expect(mod.isCrossOrigin('http://localhost:4200/api/courses', page)).toBe(false);
  expect(mod.isCrossOrigin('http://localhost:8080/api/courses', page)).toBe(true);
  expect(mod.isCrossOrigin('https://localhost:4200/api/courses', page)).toBe(true);
  expect(mod.isCrossOrigin('http://api.example.com/courses', page)).toBe(true);
});

test('devProxyConfig forwards /api/** to the Spring server on port 8080 over plain HTTP', () => {
  expect(mod.devProxyConfig).toEqual({ '/api/**': { target: 'http://localhost:8080', secure: false } });
});
