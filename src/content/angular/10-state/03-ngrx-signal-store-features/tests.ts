const { provideHttpClient } = require('@angular/common/http');
const { getState } = require('@ngrx/signals');

async function loadedStore() {
  TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  const store = TestBed.inject(modules['todos.store.ts'].TodosStore);
  await waitFor(() => expect(store.entities()).toHaveLength(3));
  return store;
}

const titles = (todos) => todos.map((todo) => todo.title);

test('onInit loads /api/todos into the entity collection', async () => {
  const store = await loadedStore();
  expect(store.ids()).toEqual([1, 2, 3]);
  expect(store.entityMap()[2].title).toBe('Master hooks');
  expect(store.loading()).toBe(false);
});

test('remainingCount and visibleTodos follow the filter', async () => {
  const store = await loadedStore();
  expect(store.remainingCount()).toBe(2);
  expect(titles(store.visibleTodos())).toEqual(['Learn JSX', 'Master hooks', 'Ship a React app']);
  store.setFilter('active');
  expect(titles(store.visibleTodos())).toEqual(['Master hooks', 'Ship a React app']);
  store.setFilter('completed');
  expect(titles(store.visibleTodos())).toEqual(['Learn JSX']);
  expect(getState(store).filter).toBe('completed');
});

test('toggle(id) and remove(id) update the entities', async () => {
  const store = await loadedStore();
  store.toggle(2);
  expect(store.entityMap()[2].completed).toBe(true);
  expect(store.remainingCount()).toBe(1);
  store.remove(1);
  expect(store.ids()).toEqual([2, 3]);
  expect(store.entityMap()[1]).toBeUndefined();
});

test('TodoList renders the todos, the remaining count and filters them', async () => {
  await render(mod.TodoList, { providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));
  expect(screen.getByText('2 remaining')).toBeInTheDocument();
  await user.click(screen.getByRole('checkbox', { name: 'Master hooks' }));
  await stable();
  expect(screen.getByText('1 remaining')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Active' }));
  await stable();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Delete Ship a React app' }));
  await stable();
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
});

test('composes withEntities, withComputed, withMethods and withHooks', () => {
  const code = sources['todos.store.ts'];
  expect(code).toMatch(/withEntities\s*<\s*Todo\s*>\s*\(/);
  expect(code).toMatch(/withComputed\(/);
  expect(code).toMatch(/withMethods\(/);
  expect(code).toMatch(/withHooks\(/);
  expect(code).toMatch(/(setAllEntities|addEntities|setEntities)\(/);
});
