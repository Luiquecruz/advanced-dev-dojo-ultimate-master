export function ProductDetailView({ product }) {
  return (
    <article>
      <h1>{product.name}</h1>
      <p>Price: ${product.price}</p>
      <p>Category: {product.category}</p>
      <a href="/products">Back to products</a>
    </article>
  );
}
