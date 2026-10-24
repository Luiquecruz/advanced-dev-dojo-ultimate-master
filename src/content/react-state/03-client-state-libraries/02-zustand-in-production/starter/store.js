import { createStore, useStore } from 'zustand';

const MAX_RECENT = 5;

export const createPreferencesSlice = (set) => ({
  theme: 'light',
  density: 'comfortable',
  setTheme: (theme) => set({ theme }, false, 'preferences/setTheme'),
  toggleDensity: () =>
    set((state) => ({ density: state.density === 'comfortable' ? 'compact' : 'comfortable' }), false, 'preferences/toggleDensity'),
});

export const createRecentSlice = (set) => ({
  recentIds: [],
  viewProduct: (id) => {
    // TODO: with produce from immer, move id to the front of recentIds, without duplicates, keeping at most MAX_RECENT ids
    // TODO: name the action 'recent/viewProduct' (third argument of set)
  },
  clearRecent: () => set({ recentIds: [] }, false, 'recent/clear'),
});

export const createUiSlice = (set) => ({
  isSettingsOpen: false,
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen }), false, 'ui/toggleSettings'),
});

// TODO: wrap the combined slices with devtools({ name: 'shop' }) and persist (name 'shop-preferences', version 2, partialize, migrate)
export const createAppStore = () =>
  createStore((...args) => ({
    ...createPreferencesSlice(...args),
    ...createRecentSlice(...args),
    ...createUiSlice(...args),
  }));

// TODO: replace this module-level singleton with a store created per AppStoreProvider and shared through context
const store = createAppStore();

export function AppStoreProvider({ children }) {
  return children;
}

export function useAppStore(selector) {
  // TODO: read the store from context and throw an Error mentioning AppStoreProvider when it is missing
  return useStore(store, selector);
}
