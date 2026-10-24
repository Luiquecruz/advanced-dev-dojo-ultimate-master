export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState(next) {
      // TODO: accept a value or an updater function (state) => nextState
      // TODO: skip when Object.is(nextState, state); otherwise store it and call every listener
    },
    subscribe(listener) {
      // TODO: add the listener and return a function that removes it
      return () => {};
    },
  };
}

export function useStore(store, selector = (state) => state) {
  // TODO: subscribe with useSyncExternalStore(store.subscribe, () => selector(store.getState()))
  return selector(store.getState());
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
