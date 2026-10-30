import { CartBadge, CartProvider } from './features/cart';
import { ProductList } from './features/catalog';

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
