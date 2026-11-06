import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export type Theme = 'light' | 'dark';

export interface PreferencesState {
  theme: Theme;
  fontSize: number;
}

const initialState: PreferencesState = { theme: 'light', fontSize: 16 };

export const PreferencesStore = signalStore(
  { providedIn: 'root' },
  // TODO: withState(initialState)
  // TODO: withMethods with toggleTheme, increaseFont, decreaseFont and reset using patchState
);
