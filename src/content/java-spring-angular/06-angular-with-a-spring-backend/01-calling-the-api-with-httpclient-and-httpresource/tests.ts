const { provideHttpClient } = require('@angular/common/http');
const { provideHttpClientTesting, HttpTestingController } = require('@angular/common/http/testing');

const listItems = () => screen.queryAllByRole('listitem').map((item) => item.textContent?.trim());

test('ProductService.getById() sends GET /api/products/<id> and emits the typed product', () => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const service = TestBed.inject(mod.ProductService);
  const http = TestBed.inject(HttpTestingController);
  const received = fn();
  service.getById(4).subscribe(received);
  const request = http.expectOne('/api/products/4');
  expect(request.request.method).toBe('GET');
  request.flush({ id: 4, name: 'Monitor', price: 340, category: 'hardware' });
  expect(received).toHaveBeenCalledWith({ id: 4, name: 'Monitor', price: 340, category: 'hardware' });
  http.verify();
});

test('ProductList renders every product returned by GET /api/products', async () => {
  await render(mod.ProductList, { providers: mod.appConfig.providers });
  await waitFor(() => expect(listItems()).toHaveLength(5));
  expect(listItems()).toEqual(['Keyboard', 'Mouse', 'IDE License', 'Monitor', 'Cloud Credits']);
});

test('shows a loading status while the request is pending and hides it afterwards', async () => {
  let release: ((products: unknown[]) => void) | undefined;
  mockApi('/api/products', () => new Promise((resolve) => (release = resolve)));
  TestBed.configureTestingModule({ providers: mod.appConfig.providers });
  const fixture = TestBed.createComponent(mod.ProductList);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  await waitFor(() => {
    fixture.detectChanges();
    expect(screen.getByRole('status')).toHaveTextContent('Loading products…');
  });
  await waitFor(() => expect(release).toBeDefined());
  release!([{ id: 1, name: 'Keyboard', price: 120, category: 'hardware' }]);
  await waitFor(() => {
    fixture.detectChanges();
    expect(screen.queryByRole('status')).toBeNull();
  });
  expect(listItems()).toEqual(['Keyboard']);
});

test('typing in the search box refetches with the q query parameter', async () => {
  const seen: string[] = [];
  mockApi('/api/products', ({ url }) => {
    seen.push(url.search);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    return [
      { id: 4, name: 'Monitor', price: 340, category: 'hardware' },
      { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
    ].filter((product) => product.name.toLowerCase().includes(q));
  });
  await render(mod.ProductList, { providers: mod.appConfig.providers });
  await waitFor(() => expect(listItems()).toHaveLength(2));
  await user.type(screen.getByLabelText('Search'), 'mon');
  await waitFor(() => expect(listItems()).toEqual(['Monitor']));
  expect(seen).toContain('?q=mon');
});

// beginner mistake: reading value() while the resource is in its error state throws, so the error branch must come before the list
test('a failed request shows an alert, no list, and Retry loads the data', async () => {
  let calls = 0;
  mockApi('/api/products', () => {
    calls++;
    return calls === 1 ? jsonResponse({ title: 'Down' }, 503) : [{ id: 1, name: 'Keyboard', price: 120, category: 'hardware' }];
  });
  await render(mod.ProductList, { providers: mod.appConfig.providers });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not load products'));
  expect(screen.queryByRole('list')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(listItems()).toEqual(['Keyboard']));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(calls).toBe(2);
});

test('loads the list with httpResource instead of subscribing by hand', () => {
  expect(source).toMatch(/httpResource\s*(<[^>]*>)?\s*\(/);
  expect(source).not.toMatch(/\.subscribe\(/);
});
