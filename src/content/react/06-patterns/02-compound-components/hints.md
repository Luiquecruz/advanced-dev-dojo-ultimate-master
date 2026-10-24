In `Tabs`, keep `const [value, setValue] = useState(defaultValue)` and wrap the children with `<TabsContext value={{ value, select }}>`, where `select` updates the state and calls `onChange?.(nextValue)`.
---
`useTabs` reads `useContext(TabsContext)`. If the result is `null`, throw `new Error(\`${componentName} must be used inside <Tabs>\`)`.
---
`Tab`: `const selected = tabs.value === value;` then `<button role="tab" aria-selected={selected} onClick={() => tabs.select(value)}>`. `TabPanel`: return `null` unless `tabs.value === value`, otherwise `<div role="tabpanel">`.
