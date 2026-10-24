async function setup(url: string) {
  const { provideRouter, withComponentInputBinding, Router } = require('@angular/router');
  const { provideHttpClient } = require('@angular/common/http');
  const { RouterTestingHarness } = require('@angular/router/testing');
  TestBed.configureTestingModule({ providers: [provideRouter(mod.routes, withComponentInputBinding()), provideHttpClient()] });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return { harness, router: TestBed.inject(Router) };
}

test('renders the resolved user as soon as navigation ends (no loading state)', async () => {
  await setup('/users/3');
  expect(screen.getByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument();
  expect(screen.getByText('grace@example.com')).toBeInTheDocument();
});

test('loads a different user for a different ":id"', async () => {
  const { harness } = await setup('/users/1');
  expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  await harness.navigateByUrl('/users/5');
  expect(screen.getByRole('heading', { name: 'Margaret Hamilton' })).toBeInTheDocument();
});

test('redirects to /not-found when the API answers with an error', async () => {
  const { router } = await setup('/users/99');
  expect(router.url).toBe('/not-found');
  expect(screen.getByRole('heading', { name: 'User not found' })).toBeInTheDocument();
});

test('userResolver requests /api/users/<id> with HttpClient', async () => {
  const { provideRouter, convertToParamMap } = require('@angular/router');
  const { provideHttpClient } = require('@angular/common/http');
  const { provideHttpClientTesting, HttpTestingController } = require('@angular/common/http/testing');
  const { firstValueFrom, isObservable, from } = require('rxjs');
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  const route = { paramMap: convertToParamMap({ id: '4' }), params: { id: '4' } };
  const result = TestBed.runInInjectionContext(() => mod.userResolver(route, { url: '/users/4' }));
  const value = firstValueFrom(isObservable(result) ? result : from(Promise.resolve(result)));
  const request = TestBed.inject(HttpTestingController).expectOne('/api/users/4');
  expect(request.request.method).toBe('GET');
  request.flush({ id: 4, name: 'Linus Torvalds', email: 'linus@example.com', role: 'editor' });
  await expect(value).resolves.toEqual({ id: 4, name: 'Linus Torvalds', email: 'linus@example.com', role: 'editor' });
});

test('attaches the resolver to the route under the "user" key', () => {
  const route = mod.routes.find((entry) => entry.path === 'users/:id');
  expect(route.resolve.user).toBe(mod.userResolver);
});
