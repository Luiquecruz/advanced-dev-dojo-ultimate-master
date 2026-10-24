import { atom } from 'jotai';

export const celsiusAtom = atom(20);

export const fahrenheitAtom = atom(
  (get) => (get(celsiusAtom) * 9) / 5 + 32,
  (get, set, fahrenheit) => set(celsiusAtom, ((fahrenheit - 32) * 5) / 9),
);

export const resetAtom = atom(null, (get, set) => set(celsiusAtom, 20));
