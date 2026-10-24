import { useState } from 'react';
// TODO: remove this static import and load Chart with lazy(() => import('./Chart'))
import Chart from './Chart';

export default function App() {
  const [showChart, setShowChart] = useState(false);

  return (
    <main>
      <h2>Reports</h2>
      <button onClick={() => setShowChart(true)}>Show chart</button>
      {/* TODO: wrap Chart in <Suspense fallback={<p>Loading chart...</p>}> */}
      {showChart && <Chart />}
    </main>
  );
}
