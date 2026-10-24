import { atom } from 'jotai';

export const celsiusAtom = atom(20);

// TODO: read (get) => Fahrenheit computed from celsiusAtom (C * 9 / 5 + 32)
// TODO: write (get, set, fahrenheit) => store the converted value in celsiusAtom ((F - 32) * 5 / 9)
export const fahrenheitAtom = atom(68);

// TODO: write-only atom (read value null) that sets celsiusAtom back to 20
export const resetAtom = atom(null, (get, set) => {});
