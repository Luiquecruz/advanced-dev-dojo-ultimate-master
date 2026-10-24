import type { PiniaPluginContext } from 'pinia';

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean;
  }
}

export function persistPlugin({ store, options }: PiniaPluginContext) {
  // TODO: do nothing unless the store was defined with { persist: true }
  // TODO: restore the JSON saved under "pinia:<store id>" with store.$patch
  // TODO: save the whole state under the same key on every change (store.$subscribe, flush: 'sync')
}
