`lazy` takes a function that returns the Promise from a dynamic `import()`. The component it returns can be rendered like any other.
---
At the top of `App.jsx`: `import { lazy, Suspense, useState } from 'react';` and `const Chart = lazy(() => import('./Chart'));`. Remember to delete the static import.
---
Render `{showChart && (<Suspense fallback={<p>Loading chart...</p>}><Chart /></Suspense>)}`.
