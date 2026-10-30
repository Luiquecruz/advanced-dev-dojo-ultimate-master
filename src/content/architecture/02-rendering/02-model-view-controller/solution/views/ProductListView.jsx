export function ProductListView({ products, query }) {
  return (
    <>
      <h1>Products</h1>
      <form method="get" action="/products">
        <input name="q" aria-label="Search products" defaultValue={query} />
        <button type="submit">Search</button>
      </form>
      {products.length === 0 ? (
        <p>No products match "{query}".</p>
      ) : (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              <a href={`/products/${product.id}`}>{product.name}</a> ${product.price}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
