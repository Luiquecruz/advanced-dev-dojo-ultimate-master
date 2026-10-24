import { createContext, use, useState } from 'react';
import { createStore, useStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { produce } from 'immer';

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
  viewProduct: (id) =>
    set(
      produce((draft) => {
        const index = draft.recentIds.indexOf(id);
        if (index !== -1) draft.recentIds.splice(index, 1);
        draft.recentIds.unshift(id);
        draft.recentIds.splice(MAX_RECENT);
      }),
      false,
      'recent/viewProduct',
    ),
  clearRecent: () => set({ recentIds: [] }, false, 'recent/clear'),
});

export const createUiSlice = (set) => ({
  isSettingsOpen: false,
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen }), false, 'ui/toggleSettings'),
});

export const createAppStore = () =>
  createStore(
    devtools(
      persist(
        (...args) => ({
          ...createPreferencesSlice(...args),
          ...createRecentSlice(...args),
          ...createUiSlice(...args),
        }),
        {
          name: 'shop-preferences',
          version: 2,
          partialize: (state) => ({ theme: state.theme, density: state.density, recentIds: state.recentIds }),
          migrate: (persisted, version) => {
            if (version < 2) {
              const { darkMode, ...rest } = persisted;
              return { ...rest, theme: darkMode ? 'dark' : 'light' };
            }
            return persisted;
          },
        },
      ),
      { name: 'shop' },
    ),
  );

const AppStoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const [store] = useState(createAppStore);
  return <AppStoreContext value={store}>{children}</AppStoreContext>;
}

export function useAppStore(selector) {
  const store = use(AppStoreContext);
  if (store === null) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return useStore(store, selector);
}
