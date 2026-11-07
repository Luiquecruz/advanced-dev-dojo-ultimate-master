import { InjectionToken, Injectable, computed, inject, signal } from '@angular/core';

export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'error'; message: string };

export const LOADER = new InjectionToken<() => Promise<string[]>>('LOADER');

@Injectable({ providedIn: 'root' })
export class NamesStore {
  private readonly loader = inject(LOADER);
  private readonly current = signal<RequestState<string[]>>({ status: 'idle' });

  readonly state = this.current.asReadonly();
  readonly names = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.data : [];
  });
  readonly isLoading = computed(() => this.state().status === 'loading');

  async load() {
    if (this.current().status === 'loading') return;
    this.current.set({ status: 'loading' });
    try {
      const data = await this.loader();
      this.current.set(data.length === 0 ? { status: 'empty' } : { status: 'success', data });
    } catch (error) {
      this.current.set({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
