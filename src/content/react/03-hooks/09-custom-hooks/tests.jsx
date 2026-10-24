test('returns the initial value when nothing is stored', () => {
  localStorage.clear();
  const { result } = renderHook(() => mod.useLocalStorage('dojo:theme', 'light'));
  expect(result.current[0]).toBe('light');
  expect(typeof result.current[1]).toBe('function');
});

test('reads and parses an existing stored value', () => {
  localStorage.clear();
  localStorage.setItem('dojo:settings', JSON.stringify({ volume: 7 }));
  const { result } = renderHook(() => mod.useLocalStorage('dojo:settings', { volume: 0 }));
  expect(result.current[0]).toEqual({ volume: 7 });
});

test('setting a value re-renders and persists it as JSON', () => {
  localStorage.clear();
  const { result } = renderHook(() => mod.useLocalStorage('dojo:tags', []));
  act(() => {
    result.current[1](['react', 'hooks']);
  });
  expect(result.current[0]).toEqual(['react', 'hooks']);
  expect(JSON.parse(localStorage.getItem('dojo:tags'))).toEqual(['react', 'hooks']);
});

test('supports functional updates like useState', () => {
  localStorage.clear();
  const { result } = renderHook(() => mod.useLocalStorage('dojo:count', 0));
  act(() => {
    result.current[1]((count) => count + 1);
    result.current[1]((count) => count + 1);
  });
  expect(result.current[0]).toBe(2);
  expect(localStorage.getItem('dojo:count')).toBe('2');
});

test('each call to the Hook keeps its own value and storage key', async () => {
  localStorage.clear();
  const App = mod.default;
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Visits: 0' }));
  await user.type(screen.getByLabelText('Your name'), 'Ada');
  expect(screen.getByRole('button')).toHaveTextContent('Visits: 1');
  expect(localStorage.getItem('dojo:name')).toBe('"Ada"');
  expect(localStorage.getItem('dojo:visits')).toBe('1');
});
