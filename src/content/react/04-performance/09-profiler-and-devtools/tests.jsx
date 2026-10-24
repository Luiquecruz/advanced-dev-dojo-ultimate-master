test('reports a "mount" for the Sidebar and Feed profilers', () => {
  const App = mod.default;
  const onRender = fn();
  render(<App onRender={onRender} />);
  const mounts = onRender.mock.calls.map(([id, phase]) => `${id}:${phase}`);
  expect(mounts).toContain('Sidebar:mount');
  expect(mounts).toContain('Feed:mount');
});

test('clicking Like reports one "update" for Feed and nothing for Sidebar', () => {
  const App = mod.default;
  const onRender = fn();
  render(<App onRender={onRender} />);
  const before = onRender.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Like (0)' }));
  const after = onRender.mock.calls.slice(before);
  expect(after).toHaveLength(1);
  expect(after[0][0]).toBe('Feed');
  expect(after[0][1]).toBe('update');
});

test('createRenderLog().onRender stores { id, phase, actualDuration } entries', () => {
  const log = mod.createRenderLog();
  log.onRender('Feed', 'mount', 1.5, 2, 0, 10);
  expect(log.entries).toEqual([{ id: 'Feed', phase: 'mount', actualDuration: 1.5 }]);
});

test('summary() counts mounts and updates per profiler id', () => {
  const App = mod.default;
  const log = mod.createRenderLog();
  render(<App onRender={log.onRender} />);
  fireEvent.click(screen.getByRole('button', { name: 'Like (0)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Like (1)' }));
  expect(log.summary()).toEqual({
    Sidebar: { mount: 1, update: 0 },
    Feed: { mount: 1, update: 2 },
  });
  expect(log.entries.every((entry) => typeof entry.actualDuration === 'number')).toBe(true);
});

test('uses the Profiler component from react', () => {
  expect(source).toMatch(/<Profiler\s+id=/);
});
