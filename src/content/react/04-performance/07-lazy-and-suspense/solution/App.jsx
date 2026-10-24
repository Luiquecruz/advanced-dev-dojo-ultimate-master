import { lazy, Suspense, useState } from 'react';

const Chart = lazy(() => import('./Chart'));

export default function App() {
  const [showChart, setShowChart] = useState(false);

  return (
    <main>
      <h2>Reports</h2>
      <button onClick={() => setShowChart(true)}>Show chart</button>
      {showChart && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <Chart />
        </Suspense>
      )}
    </main>
  );
}
