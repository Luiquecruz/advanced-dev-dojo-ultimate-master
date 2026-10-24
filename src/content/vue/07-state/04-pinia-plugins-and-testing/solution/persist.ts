import type { PiniaPluginContext } from 'pinia';

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean;
  }
}

export function persistPlugin({ store, options }: PiniaPluginContext) {
  if (!options.persist) {
    return;
  }
  const key = `pinia:${store.$id}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    store.$patch(JSON.parse(saved));
  }
  store.$subscribe(
    (_mutation, state) => {
      localStorage.setItem(key, JSON.stringify(state));
    },
    { flush: 'sync' },
  );
}
