import { useEffect, useState } from 'react';
import { Link, usePathname } from './router';

function Home() {
  return (
    <>
      <h1>Home</h1>
      <p>One HTML shell, one bundle, every page rendered in the browser.</p>
    </>
  );
}

function Products() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let ignore = false;
    fetch('/api/products')
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) {
          setProducts(data);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <h1>Products</h1>
      {products === null ? (
        <p>Loading…</p>
      ) : (
        <ul aria-label="Products">
          {products.map((product) => (
            <li key={product.id}>{product.name}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <Link to="/">Go home</Link>
    </>
  );
}

const ROUTES = {
  '/': Home,
  '/products': Products,
};

export default function App() {
  const pathname = usePathname();
  const Page = ROUTES[pathname] ?? NotFound;

  return (
    <>
      <nav aria-label="Main">
        <Link to="/">Home</Link> <Link to="/products">Products</Link>
      </nav>
      <main>
        <Page />
      </main>
    </>
  );
}
