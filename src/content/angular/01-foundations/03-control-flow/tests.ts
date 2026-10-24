const items = () => screen.getAllByRole('listitem').map((item) => item.textContent!.replace(/\s+/g, ' ').trim());

test('renders one numbered <li> per task', async () => {
  await render(mod.TaskList);
  expect(items()).toEqual(['1. Write docs High', '2. Fix bug', '3. Review PR Low']);
});

test('shows a badge only for high and low priorities', async () => {
  const { element } = await render(mod.TaskList);
  const badges = [...element.querySelectorAll('li .badge')].map((badge) => badge.textContent!.trim());
  expect(badges).toEqual(['High', 'Low']);
});

test('re-renders when the filter changes', async () => {
  await render(mod.TaskList);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await stable();
  expect(items()).toEqual(['1. Write docs High', '2. Review PR Low']);
  await user.click(screen.getByRole('button', { name: 'Done' }));
  await stable();
  expect(items()).toEqual(['1. Fix bug']);
});

test('renders "No tasks" with @empty and "All done!" when nothing is open', async () => {
  const { component, element, stable } = await render(mod.TaskList);
  expect(element.querySelector('.summary')).toHaveTextContent('2 open');
  component.tasks.set([{ id: 9, title: 'Ship it', done: true, priority: 'normal' }]);
  await stable();
  expect(element.querySelector('.summary')).toHaveTextContent('All done!');
  component.tasks.set([]);
  await stable();
  expect(items()).toEqual(['No tasks']);
});

test('uses @for with track, @switch, @empty and @let', () => {
  expect(source).toMatch(/@for\s*\([^;]*;\s*track\s+task\.id/);
  expect(source).toMatch(/@switch\s*\(/);
  expect(source).toMatch(/@empty/);
  expect(source).toMatch(/@let\s+open\s*=/);
});
