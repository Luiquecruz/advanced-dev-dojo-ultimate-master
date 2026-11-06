const { provideHttpClient } = require('@angular/common/http');

const problem = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ type: 'about:blank', status, ...body }), { status, headers: { 'Content-Type': 'application/problem+json' } });

async function fillAndSubmit(name: string, email: string) {
  const rendered = await render(mod.SignupForm, { providers: [provideHttpClient()] });
  if (name) await user.type(screen.getByLabelText('Name'), name);
  if (email) await user.type(screen.getByLabelText('Email'), email);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  await stable();
  return rendered;
}

test('isProblemDetail() accepts objects with a numeric status or a string title and nothing else', () => {
  expect(mod.isProblemDetail({ status: 400 })).toBe(true);
  expect(mod.isProblemDetail({ title: 'Bad Request', detail: 'x' })).toBe(true);
  expect(mod.isProblemDetail({ error: 'Not found' })).toBe(false);
  expect(mod.isProblemDetail(null)).toBe(false);
  expect(mod.isProblemDetail('Internal Server Error')).toBe(false);
});

test('a successful POST sends the form value as JSON and welcomes the user', async () => {
  let received: unknown;
  mockApi('/api/users', ({ body }) => {
    received = body;
    return jsonResponse({ id: 6, name: 'Ada', email: 'ada@new.example.com' }, 201);
  });
  await fillAndSubmit('Ada', 'ada@new.example.com');
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Welcome, Ada!'));
  expect(received).toEqual({ name: 'Ada', email: 'ada@new.example.com' });
});

test('field errors of a Problem Details response appear under the matching field only', async () => {
  mockApi('/api/users', () =>
    problem(400, { title: 'Bad Request', detail: 'Validation failed', errors: [{ field: 'email', message: 'must be a well-formed email address' }] }),
  );
  const { component } = await fillAndSubmit('Ada', 'not-an-email');
  await waitFor(() => expect(screen.getByText('must be a well-formed email address')).toBeInTheDocument());
  expect(component.signupForm.email().errors().map((error) => error.message)).toEqual(['must be a well-formed email address']);
  expect(component.signupForm.name().errors()).toEqual([]);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('status')).toBeNull();
});

test('a Problem Details response without field errors shows its detail as a form-level alert', async () => {
  mockApi('/api/users', () => problem(409, { title: 'Conflict', detail: 'Email already registered' }));
  const { component } = await fillAndSubmit('Ada', 'ada@example.com');
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email already registered'));
  expect(component.signupForm.email().errors()).toEqual([]);
});

// beginner mistake: assuming every error body is a Problem Details document, then reading errors from an empty or non-JSON body
test('a failure with an empty or non-JSON body shows a generic alert instead of crashing', async () => {
  mockApi('/api/users', () => new Response(null, { status: 502 }));
  await fillAndSubmit('Ada', 'ada@example.com');
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong, try again'));
  expect(screen.queryByRole('status')).toBeNull();
});

test('client validation still blocks an empty submission without calling the server', async () => {
  const calls = fn();
  mockApi('/api/users', () => {
    calls();
    return jsonResponse({ id: 7 }, 201);
  });
  await fillAndSubmit('', '');
  await waitFor(() => expect(screen.getByText('Name is required')).toBeInTheDocument());
  expect(screen.getByText('Email is required')).toBeInTheDocument();
  expect(calls).not.toHaveBeenCalled();
});
