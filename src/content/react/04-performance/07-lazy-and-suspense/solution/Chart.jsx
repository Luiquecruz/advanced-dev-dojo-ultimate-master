const SALES = [
  { month: 'Jan', total: 120 },
  { month: 'Feb', total: 180 },
  { month: 'Mar', total: 90 },
];

export default function Chart() {
  return (
    <figure>
      <h3>Sales chart</h3>
      <ul>
        {SALES.map(({ month, total }) => (
          <li key={month}>
            {month}: {total}
          </li>
        ))}
      </ul>
    </figure>
  );
}
