import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ProductSearchPage } from './features/products/ProductSearchPage';

function CurrentUrl() {
  const location = useLocation();
  return (
    <p>
      URL: <code>{location.pathname + location.search}</code>
    </p>
  );
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/products?category=hardware&sort=price']}>
      <main>
        <CurrentUrl />
        <Routes>
          <Route path="/products" element={<ProductSearchPage />} />
        </Routes>
      </main>
    </MemoryRouter>
  );
}
