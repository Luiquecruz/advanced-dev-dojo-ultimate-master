import { useSyncExternalStore } from 'react';

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState(next) {
      const nextState = typeof next === 'function' ? next(state) : next;
      if (Object.is(nextState, state)) return;
      state = nextState;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore(store, selector = (state) => state) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

const cartStore = createStore({ items: 0, coupon: '' });

function CartBadge() {
  const items = useStore(cartStore, (state) => state.items);
  return <p>Cart: {items}</p>;
}

function AddButton() {
  return (
    <button onClick={() => cartStore.setState((state) => ({ ...state, items: state.items + 1 }))}>
      Add to cart
    </button>
  );
}

export default function App() {
  return (
    <section>
      <CartBadge />
      <AddButton />
    </section>
  );
}
