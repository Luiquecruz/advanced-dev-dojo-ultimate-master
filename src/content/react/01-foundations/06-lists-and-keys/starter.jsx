export const products = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
  { id: 4, name: 'Monitor', price: 340, category: 'hardware' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];

export default function ProductList({ products: items = products, maxPrice }) {
  // TODO: keep products with price <= maxPrice (all of them when maxPrice is undefined)
  // TODO: sort a copy by price, ascending
  // TODO: return <p>No products found.</p> when nothing matches

  return (
    <ul>
      {/* TODO: render one <li key={...}> per product with the text "Name: $price" */}
    </ul>
  );
}
