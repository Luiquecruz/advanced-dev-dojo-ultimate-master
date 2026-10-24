import { memo, useMemo, useState } from 'react';

export function summarizeOrders(orders) {
  const total = orders.reduce((sum, order) => sum + order.amount, 0);
  return { count: orders.length, total };
}

export const Chart = memo(function Chart({ stats, onRender }) {
  onRender?.();
  return (
    <figure>
      <figcaption>{stats.count} orders</figcaption>
      <p>Total: ${stats.total}</p>
    </figure>
  );
});

export default function Dashboard({ orders, computeStats = summarizeOrders, onChartRender }) {
  const [dark, setDark] = useState(false);

  // TODO: cache this calculation with useMemo so it only re-runs when its inputs change
  const stats = computeStats(orders);

  return (
    <main className={dark ? 'dark' : 'light'}>
      <button onClick={() => setDark((value) => !value)}>{dark ? 'Light mode' : 'Dark mode'}</button>
      <Chart stats={stats} onRender={onChartRender} />
    </main>
  );
}
