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
  // TODO: fetch /api/products on the client, show <p>Loading…</p> until it resolves,
  // then a <ul aria-label="Products"> with one <li> per product name
  return <h1>Products</h1>;
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
