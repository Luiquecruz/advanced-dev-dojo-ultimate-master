export const products = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
  { id: 4, name: 'Monitor', price: 340, category: 'hardware' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];

export default function ProductList({ products: items = products, maxPrice }) {
  const visible = items
    .filter((product) => maxPrice === undefined || product.price <= maxPrice)
    .sort((first, second) => first.price - second.price);

  if (visible.length === 0) {
    return <p>No products found.</p>;
  }

  return (
    <ul>
      {visible.map((product) => (
        <li key={product.id}>
          {product.name}: ${product.price}
        </li>
      ))}
    </ul>
  );
}
