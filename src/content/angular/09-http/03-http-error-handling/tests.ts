const { provideHttpClient } = require('@angular/common/http');
const { provideHttpClientTesting, HttpTestingController } = require('@angular/common/http/testing');

function setupService() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return {
    service: TestBed.inject(modules['user.service.ts'].UserService),
    http: TestBed.inject(HttpTestingController),
  };
}

const serverError = { status: 503, statusText: 'Service Unavailable' };
const ada = { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' };

test('retries 5xx failures twice with a growing delay and then succeeds', async () => {
  const { service, http } = setupService();
  const next = fn();
  service.getUser(1).subscribe({ next, error: () => undefined });
  http.expectOne('/api/users/1').flush(null, serverError);
  await sleep(150);
  http.expectOne('/api/users/1').flush(null, serverError);
  await sleep(250);
  http.expectOne('/api/users/1').flush(ada);
  expect(next).toHaveBeenCalledWith(ada);
});

test('gives up after 3 attempts with "Server error, please try again later"', async () => {
  const { service, http } = setupService();
  const error = fn();
  service.getUser(1).subscribe({ error });
  http.expectOne('/api/users/1').flush(null, serverError);
  await sleep(150);
  http.expectOne('/api/users/1').flush(null, serverError);
  await sleep(250);
  http.expectOne('/api/users/1').flush(null, serverError);
  expect(error).toHaveBeenCalledTimes(1);
  expect(error.mock.calls[0][0]).toBeInstanceOf(Error);
  expect(error.mock.calls[0][0].message).toBe('Server error, please try again later');
});

test('does not retry a 404 and reports "User not found"', async () => {
  const { service, http } = setupService();
  const error = fn();
  service.getUser(42).subscribe({ error });
  http.expectOne('/api/users/42').flush({ error: 'Not found' }, { status: 404, statusText: 'Not Found' });
  await sleep(150);
  http.verify();
  expect(error.mock.calls[0][0].message).toBe('User not found');
});

test('maps network failures (status 0) to "Network error, check your connection"', () => {
  const { service, http } = setupService();
  const error = fn();
  service.getUser(1).subscribe({ error });
  http.expectOne('/api/users/1').error(new ProgressEvent('error'));
  expect(error.mock.calls[0][0].message).toBe('Network error, check your connection');
});

test('UserCard shows the error with a Retry button that recovers', async () => {
  let calls = 0;
  mockApi('/api/users/2', () => {
    calls++;
    return calls <= 3 ? jsonResponse({ error: 'Down' }, 503) : { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'editor' };
  });
  await render(mod.UserCard, { inputs: { userId: 2 }, providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Server error, please try again later'), { timeout: 2000 });
  expect(calls).toBe(3);
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Alan Turing' })).toBeInTheDocument());
});

test('UserCard renders "User not found" for an unknown id', async () => {
  await render(mod.UserCard, { inputs: { userId: 99 }, providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('User not found'));
});
