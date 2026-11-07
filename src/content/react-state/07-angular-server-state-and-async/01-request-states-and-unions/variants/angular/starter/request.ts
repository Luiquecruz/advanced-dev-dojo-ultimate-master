import { InjectionToken, Injectable, computed, inject, signal } from '@angular/core';

// TODO: export the RequestState<T> discriminated union
export type RequestState<T> = unknown;

export const LOADER = new InjectionToken<() => Promise<string[]>>('LOADER');

@Injectable({ providedIn: 'root' })
export class NamesStore {
  private readonly loader = inject(LOADER);

  // TODO: private signal with the state, read-only `state`, `names` and `isLoading`

  async load() {
    // TODO: guard, loading, then success / empty / error
  }
}
