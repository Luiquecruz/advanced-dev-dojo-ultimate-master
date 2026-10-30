import { CartPage } from './CartPage';
import { createCartStore } from './cartStore';

export function register(shell) {
  const store = createCartStore();
  shell.events.on('cart:add', store.add);

  function CartRoute() {
    return <CartPage store={store} />;
  }

  shell.addPage({ path: '/cart', title: 'Cart', Component: CartRoute });
}
