import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export type Theme = 'light' | 'dark';

export interface PreferencesState {
  theme: Theme;
  fontSize: number;
}

const initialState: PreferencesState = { theme: 'light', fontSize: 16 };

export const PreferencesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    toggleTheme() {
      patchState(store, { theme: store.theme() === 'light' ? 'dark' : 'light' });
    },
    increaseFont() {
      patchState(store, (state) => ({ fontSize: Math.min(24, state.fontSize + 2) }));
    },
    decreaseFont() {
      patchState(store, (state) => ({ fontSize: Math.max(12, state.fontSize - 2) }));
    },
    reset() {
      patchState(store, initialState);
    },
  })),
);
