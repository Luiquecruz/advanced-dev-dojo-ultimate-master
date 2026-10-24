const { provideHttpClient } = require('@angular/common/http');
const { provideHttpClientTesting, HttpTestingController } = require('@angular/common/http/testing');

function serviceWithTestingBackend() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { service: TestBed.inject(modules['todo.service.ts'].TodoService), http: TestBed.inject(HttpTestingController) };
}

test('TodoService.getAll() sends GET /api/todos and emits the typed list', () => {
  const { service, http } = serviceWithTestingBackend();
  const received = fn();
  service.getAll().subscribe(received);
  const request = http.expectOne('/api/todos');
  expect(request.request.method).toBe('GET');
  request.flush([{ id: 9, title: 'Flushed', completed: false }]);
  expect(received).toHaveBeenCalledWith([{ id: 9, title: 'Flushed', completed: false }]);
  http.verify();
});

test('TodoService.add() POSTs { title } and toggle() PATCHes the inverted completed flag', () => {
  const { service, http } = serviceWithTestingBackend();
  service.add('Write tests').subscribe();
  const post = http.expectOne('/api/todos');
  expect(post.request.method).toBe('POST');
  expect(post.request.body).toEqual({ title: 'Write tests' });
  service.toggle({ id: 2, title: 'Master hooks', completed: false }).subscribe();
  const patch = http.expectOne('/api/todos/2');
  expect(patch.request.method).toBe('PATCH');
  expect(patch.request.body).toEqual({ completed: true });
});

test('TodoList renders the todos loaded from the API', async () => {
  await render(mod.TodoList, { providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(3));
  expect(screen.getByRole('checkbox', { name: 'Learn JSX' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Master hooks' })).not.toBeChecked();
});

test('adding a todo appends the server response and clears the input', async () => {
  await render(mod.TodoList, { providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(3));
  await user.type(screen.getByLabelText('New todo'), 'Learn HttpClient');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Learn HttpClient' })).toBeInTheDocument());
  expect(screen.getByLabelText('New todo')).toHaveValue('');
});

test('toggling a todo saves it and shows the updated state', async () => {
  await render(mod.TodoList, { providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(3));
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Master hooks' })).toBeChecked());
  const response = await fetch('/api/todos/2');
  expect((await response.json()).completed).toBe(true);
});
