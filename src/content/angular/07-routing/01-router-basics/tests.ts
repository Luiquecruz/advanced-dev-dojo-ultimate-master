async function setup(url: string) {
  const { provideRouter, Router } = require('@angular/router');
  const view = await render(mod.App, { providers: [provideRouter(mod.routes)] });
  await TestBed.inject(Router).navigateByUrl(url);
  await view.stable();
  return view;
}

test('renders the Home page inside the outlet at "/"', async () => {
  const { element } = await setup('/');
  expect(element.querySelector('main h2')).toHaveTextContent('Welcome home');
});

test('clicking the "About" link navigates to the About page', async () => {
  await setup('/');
  await user.click(screen.getByRole('link', { name: 'About' }));
  await stable();
  await waitFor(() => expect(screen.getByRole('heading', { name: 'About us' })).toBeInTheDocument());
  expect(screen.queryByText('Welcome home')).toBeNull();
});

test('marks only the current link with the "active" class', async () => {
  await setup('/about');
  expect(screen.getByRole('link', { name: 'About' })).toHaveClass('active');
  expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('active');
});

test('redirects /home to the Home page and shows NotFound for unknown paths', async () => {
  const { Router } = require('@angular/router');
  await setup('/home');
  const router = TestBed.inject(Router);
  expect(router.url).toBe('/');
  expect(screen.getByRole('heading', { name: 'Welcome home' })).toBeInTheDocument();
  await router.navigateByUrl('/does/not/exist');
  await stable();
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
});

test('sets the document title from the route "title"', async () => {
  await setup('/about');
  await waitFor(() => expect(document.title).toBe('About'));
});

test('exports an appConfig that provides the router', () => {
  expect(source).toMatch(/provideRouter\(\s*routes/);
});
