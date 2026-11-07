import { computed, inject, InjectionToken } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const FETCH_PRODUCTS = new InjectionToken<() => Promise<Product[]>>('FETCH_PRODUCTS');
export const CART_STORAGE = new InjectionToken<CartStorage>('CART_STORAGE');

type ShopState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  products: Product[];
  category: string;
  quantities: Record<number, number>;
};

const initialState: ShopState = { status: 'idle', products: [], category: 'all', quantities: {} };

function readQuantities(storage: CartStorage): Record<number, number> {
  try {
    const envelope = JSON.parse(storage.getItem('cart') ?? 'null');
    if (envelope?.version !== 1 || typeof envelope.quantities !== 'object' || envelope.quantities === null) return {};
    const quantities: Record<number, number> = {};
    for (const [key, value] of Object.entries(envelope.quantities)) {
      const id = Number(key);
      if (Number.isInteger(id) && Number.isInteger(value) && (value as number) > 0) quantities[id] = value as number;
    }
    return quantities;
  } catch {
    return {};
  }
}

export const ShopStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const visible = computed(() =>
      store.products().filter((product) => store.category() === 'all' || product.category === store.category()),
    );
    const lines = computed(() =>
      store
        .products()
        .filter((product) => (store.quantities()[product.id] ?? 0) > 0)
        .map((product) => {
          const quantity = store.quantities()[product.id];
          return { product, quantity, subtotal: product.price * quantity };
        }),
    );
    return {
      visible,
      lines,
      total: computed(() => lines().reduce((sum, line) => sum + line.subtotal, 0)),
      itemCount: computed(() => lines().reduce((sum, line) => sum + line.quantity, 0)),
    };
  }),
  withMethods((store, fetchProducts = inject(FETCH_PRODUCTS), storage = inject(CART_STORAGE)) => {
    const persist = () => {
      try {
        storage.setItem('cart', JSON.stringify({ version: 1, quantities: store.quantities() }));
      } catch {
        // full or blocked storage: the cart stays in memory
      }
    };
    return {
      async load() {
        if (store.status() === 'loading') return;
        patchState(store, { status: 'loading' });
        try {
          const products = await fetchProducts();
          patchState(store, { products, status: 'ready' });
        } catch {
          patchState(store, { status: 'error' });
        }
      },
      setCategory(category: string) {
        patchState(store, { category });
      },
      add(id: number) {
        patchState(store, (state) => ({ quantities: { ...state.quantities, [id]: (state.quantities[id] ?? 0) + 1 } }));
        persist();
      },
      remove(id: number) {
        const current = store.quantities()[id] ?? 0;
        if (current === 0) return;
        patchState(store, (state) => {
          const { [id]: _removed, ...rest } = state.quantities;
          return { quantities: current > 1 ? { ...rest, [id]: current - 1 } : rest };
        });
        persist();
      },
    };
  }),
  withHooks((store, storage = inject(CART_STORAGE)) => ({
    onInit() {
      patchState(store, { quantities: readQuantities(storage) });
    },
  })),
);
