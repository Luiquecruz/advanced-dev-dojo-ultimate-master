import { useState } from 'react';

export const orders = [
  { id: 1, product: 'Keyboard', region: 'North', amount: 1200 },
  { id: 2, product: 'Monitor', region: 'South', amount: 3400 },
  { id: 3, product: 'Mouse', region: 'North', amount: 450 },
  { id: 4, product: 'Cloud Credits', region: 'East', amount: 500 },
];

export function SalesChart({ onRender }) {
  onRender?.();
  const totals = {};
  orders.forEach((order) => {
    totals[order.region] = (totals[order.region] ?? 0) + order.amount;
  });
  return (
    <figure aria-label="Sales chart">
      {Object.entries(totals).map(([region, total]) => (
        <div key={region} className="bar" style={{ width: total / 20 }}>
          {region}: ${total}
        </div>
      ))}
    </figure>
  );
}

function SearchBox({ query, onQueryChange }) {
  return <input aria-label="Search orders" value={query} onChange={(event) => onQueryChange(event.target.value)} />;
}

function OrderList({ orders, onSelect }) {
  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>
          <button onClick={() => onSelect(order.id)}>{order.product}</button>
        </li>
      ))}
    </ul>
  );
}

function SelectionSummary({ order }) {
  return <p data-testid="selection">{order ? `Selected: ${order.product} (${order.region})` : 'No order selected'}</p>;
}

// TODO: create SearchPanel, the closest common parent of SearchBox, OrderList and SelectionSummary, and move query + selectedId into it
// TODO: create AccentFrame({ children }) that owns the accent state and renders the select plus the frame around its children

export default function Dashboard({ onChartRender }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [accent, setAccent] = useState('violet');
  const visible = orders.filter((order) => order.product.toLowerCase().includes(query.toLowerCase()));
  const selected = orders.find((order) => order.id === selectedId) ?? null;

  return (
    <div className={`frame frame-${accent}`} data-testid="frame">
      <select aria-label="Accent" value={accent} onChange={(event) => setAccent(event.target.value)}>
        <option value="violet">Violet</option>
        <option value="teal">Teal</option>
      </select>
      <section>
        <SearchBox query={query} onQueryChange={setQuery} />
        <OrderList orders={visible} onSelect={setSelectedId} />
        <SelectionSummary order={selected} />
      </section>
      <SalesChart onRender={onChartRender} />
    </div>
  );
}
