const { provideRouter, Router } = require('@angular/router');
const { Component } = require('@angular/core');

class Blank {}
const setup = async (url = '/') => {
  TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Blank }])] });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  return { router, urlFilters: TestBed.inject(mod.UrlFilters) };
};
const params = (text) => new URLSearchParams(text);

test('parseFilters reads valid values and falls back to defaults', () => {
  expect(mod.parseFilters(params('q=ang&sort=price&page=3'))).toEqual({ q: 'ang', sort: 'price', page: 3 });
  expect(mod.parseFilters(params(''))).toEqual({ q: '', sort: 'name', page: 1 });
  expect(mod.parseFilters(params('sort=<script>&page=abc'))).toEqual({ q: '', sort: 'name', page: 1 });
  expect(mod.parseFilters(params('page=0'))).toEqual({ q: '', sort: 'name', page: 1 });
  expect(mod.parseFilters(params('page=2.5'))).toEqual({ q: '', sort: 'name', page: 1 });
});

test('toQueryParams omits the default values', () => {
  expect(mod.toQueryParams(mod.DEFAULT_FILTERS)).toEqual({});
  expect(mod.toQueryParams({ q: 'x', sort: 'name', page: 1 })).toEqual({ q: 'x' });
  expect(mod.toQueryParams({ q: '', sort: 'price', page: 4 })).toEqual({ sort: 'price', page: 4 });
});

test('filters is a signal that follows the URL', async () => {
  const { router, urlFilters } = await setup('/?q=ang&page=2');
  expect(urlFilters.filters()).toEqual({ q: 'ang', sort: 'name', page: 2 });
  await router.navigateByUrl('/?sort=price');
  expect(urlFilters.filters()).toEqual({ q: '', sort: 'price', page: 1 });
});

test('update() writes the URL and the signal follows it', async () => {
  const { router, urlFilters } = await setup('/');
  urlFilters.update({ q: 'rx' });
  await waitFor(() => expect(router.url).toBe('/?q=rx'));
  expect(urlFilters.filters().q).toBe('rx');
  urlFilters.update({ page: 3 });
  await waitFor(() => expect(router.url).toBe('/?q=rx&page=3'));
});

test('changing another filter resets the page', async () => {
  const { router, urlFilters } = await setup('/?q=rx&page=3');
  urlFilters.update({ sort: 'price' });
  await waitFor(() => expect(router.url).toBe('/?q=rx&sort=price'));
  expect(urlFilters.filters().page).toBe(1);
});
