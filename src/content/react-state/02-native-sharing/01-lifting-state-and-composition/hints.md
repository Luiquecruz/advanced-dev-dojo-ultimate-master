A component re-renders together with everything it renders. Which components actually read `query` and `selectedId`? Only the three inside the `<section>`. Give them their own parent.
---
Move the two `useState` calls, `visible` and `selected` into `function SearchPanel()` and render the `<section>` from there.
---
For the accent, the frame must wrap the chart. Pass the chart through `children`: elements created by `Dashboard` are not recreated when `AccentFrame`'s state changes.
---
`export default function Dashboard({ onChartRender }) { return <AccentFrame><SearchPanel /><SalesChart onRender={onChartRender} /></AccentFrame>; }`
