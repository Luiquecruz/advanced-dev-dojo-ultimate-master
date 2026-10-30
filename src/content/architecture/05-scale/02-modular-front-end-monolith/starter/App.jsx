import { useState } from 'react';
import { createShell } from './shell/createShell';
import { Shell } from './shell/Shell';
import * as accountModule from './modules/account';
import { CatalogPage } from './modules/catalog/CatalogPage';
import { CartPage } from './modules/cart/CartPage';
import { cartStore } from './modules/cart/cartStore';

function CartRoute() {
  return <CartPage store={cartStore} />;
}

export function createApp() {
  const shell = createShell();
  // TODO: import catalog and cart through their public index and call register(shell) on each, in the order catalog, cart, account
  shell.addPage({ path: '/catalog', title: 'Catalog', Component: CatalogPage });
  shell.addPage({ path: '/cart', title: 'Cart', Component: CartRoute });
  accountModule.register(shell);
  return shell;
}

export default function App() {
  const [shell] = useState(createApp);
  return <Shell shell={shell} />;
}
