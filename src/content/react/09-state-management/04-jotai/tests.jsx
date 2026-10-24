const { createStore } = require('jotai');

test('fahrenheitAtom derives its value from celsiusAtom', () => {
  const { celsiusAtom, fahrenheitAtom } = modules['atoms.js'];
  const store = createStore();
  expect(store.get(fahrenheitAtom)).toBe(68);
  store.set(celsiusAtom, 100);
  expect(store.get(fahrenheitAtom)).toBe(212);
});

test('writing fahrenheitAtom updates celsiusAtom and resetAtom restores 20', () => {
  const { celsiusAtom, fahrenheitAtom, resetAtom } = modules['atoms.js'];
  const store = createStore();
  store.set(fahrenheitAtom, 32);
  expect(store.get(celsiusAtom)).toBe(0);
  store.set(resetAtom);
  expect(store.get(celsiusAtom)).toBe(20);
});

test('typing in Celsius updates the Fahrenheit input', () => {
  const App = mod.default;
  render(<App />);
  fireEvent.change(screen.getByLabelText('Celsius'), { target: { value: '100' } });
  expect(screen.getByLabelText('Fahrenheit')).toHaveValue(212);
});

test('typing in Fahrenheit updates the Celsius input', () => {
  const App = mod.default;
  render(<App />);
  fireEvent.change(screen.getByLabelText('Fahrenheit'), { target: { value: '212' } });
  expect(screen.getByLabelText('Celsius')).toHaveValue(100);
});

test('"Reset" sets both inputs back to 20 °C / 68 °F', async () => {
  const App = mod.default;
  render(<App />);
  fireEvent.change(screen.getByLabelText('Celsius'), { target: { value: '0' } });
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByLabelText('Celsius')).toHaveValue(20);
  expect(screen.getByLabelText('Fahrenheit')).toHaveValue(68);
});

test('each App instance has its own store thanks to <Provider>', () => {
  const App = mod.default;
  render(
    <div>
      <section data-testid="first"><App /></section>
      <section data-testid="second"><App /></section>
    </div>,
  );
  const first = within(screen.getByTestId('first'));
  const second = within(screen.getByTestId('second'));
  fireEvent.change(first.getByLabelText('Celsius'), { target: { value: '100' } });
  expect(first.getByLabelText('Fahrenheit')).toHaveValue(212);
  expect(second.getByLabelText('Celsius')).toHaveValue(20);
});
