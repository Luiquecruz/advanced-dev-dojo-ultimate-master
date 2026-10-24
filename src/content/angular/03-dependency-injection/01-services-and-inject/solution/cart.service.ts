import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly state = signal<string[]>([]);
  readonly items = this.state.asReadonly();
  readonly count = computed(() => this.state().length);

  add(item: string) {
    this.state.update((items) => [...items, item]);
  }

  clear() {
    this.state.set([]);
  }
}
