Ask of each state variable: "can I compute this from something I already have?" The total can be computed from `items`, and the selected item can be found in `items` if you know its id.
---
Delete the `total` state and compute it during render: `const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);`.
---
Replace `selectedItem` state with `const [selectedId, setSelectedId] = useState(null);`, call `setSelectedId(item.id)` on click, and derive `const selectedItem = items.find((item) => item.id === selectedId);`. A removed item is simply not found.
