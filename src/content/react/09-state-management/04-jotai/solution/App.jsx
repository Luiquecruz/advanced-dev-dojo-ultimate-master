import { Provider, useAtom, useSetAtom } from 'jotai';
import { celsiusAtom, fahrenheitAtom, resetAtom } from './atoms';

export function CelsiusInput() {
  const [celsius, setCelsius] = useAtom(celsiusAtom);
  return (
    <label>
      Celsius
      <input type="number" value={celsius} onChange={(event) => setCelsius(Number(event.target.value))} />
    </label>
  );
}

export function FahrenheitInput() {
  const [fahrenheit, setFahrenheit] = useAtom(fahrenheitAtom);
  return (
    <label>
      Fahrenheit
      <input type="number" value={fahrenheit} onChange={(event) => setFahrenheit(Number(event.target.value))} />
    </label>
  );
}

export function ResetButton() {
  const reset = useSetAtom(resetAtom);
  return <button onClick={reset}>Reset</button>;
}

export default function App() {
  return (
    <Provider>
      <CelsiusInput />
      <FahrenheitInput />
      <ResetButton />
    </Provider>
  );
}
