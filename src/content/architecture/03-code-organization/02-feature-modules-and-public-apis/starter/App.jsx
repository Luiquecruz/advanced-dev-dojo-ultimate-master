// TODO: import each feature through its public API ('./features/catalog' and './features/cart')
import { ProductList } from './features/catalog/components/ProductList';
import { CartBadge } from './features/cart/components/CartBadge';
import { CartProvider } from './features/cart/model/CartContext';

export default function App() {
  return (
    <CartProvider>
      <header>
        <h1>Dojo Store</h1>
        <CartBadge />
      </header>
      <main>
        <ProductList />
      </main>
    </CartProvider>
  );
}
