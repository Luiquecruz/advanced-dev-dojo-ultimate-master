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
  // TODO: read and write fahrenheitAtom with useAtom
  const fahrenheit = 68;
  return (
    <label>
      Fahrenheit
      <input type="number" value={fahrenheit} onChange={() => {}} />
    </label>
  );
}

export function ResetButton() {
  // TODO: get the reset function with useSetAtom(resetAtom) and call it on click
  return <button>Reset</button>;
}

export default function App() {
  // TODO: wrap the converter in a jotai <Provider> so every App instance has its own store
  return (
    <>
      <CelsiusInput />
      <FahrenheitInput />
      <ResetButton />
    </>
  );
}
