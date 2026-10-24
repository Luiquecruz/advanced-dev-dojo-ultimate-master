Ask, for each state variable: can it be computed from props or other state? `visible` and `unreadCount` can. `items` is just a stale copy of the prop.
---
Replace `items` with `const [readIds, setReadIds] = useState(() => new Set());` and write a helper `isRead(notification)` that checks `notification.read || readIds.has(notification.id)`.
---
Updating a `Set` immutably: `setReadIds((previous) => new Set(previous).add(id))`. For "mark all": `setReadIds(new Set(notifications.map((n) => n.id)))`.
---
Selection: `const [selectedId, setSelectedId] = useState(null);` and `const selected = notifications.find((n) => n.id === selectedId) ?? null;`. Use `isRead(selected)` in the details text.
