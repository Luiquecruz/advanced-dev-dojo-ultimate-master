import { ProductList } from './features/catalog';

export default function App({ catalog }) {
  return (
    <div className="store">
      <header>
        <h1>Dev Dojo Store</h1>
        <p>{catalog.count} products</p>
      </header>
      <main>
        <ProductList products={catalog.products} />
      </main>
    </div>
  );
}

export function ErrorPage({ title }) {
  return (
    <main>
      <h1>{title}</h1>
      <a href="/">Back to the catalog</a>
    </main>
  );
}
