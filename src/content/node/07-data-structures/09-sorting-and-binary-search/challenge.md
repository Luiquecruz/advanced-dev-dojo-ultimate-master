An operations service sorts orders for a fulfilment screen and answers time-range questions over a sorted event log.

```ts
interface Order { id: number; priority: 'high' | 'normal' | 'low'; createdAt: number; total: number }
```

1. `sortOrders(orders): Order[]` returns a **new** array (the input is not modified) sorted by priority (`high`, then `normal`, then `low`), then by `createdAt` ascending (oldest first), then by `id` ascending.
2. `lowerBound(items, target, key?)` takes an array sorted ascending by `key(item)` (default: the item itself as a number) and returns the first index whose key is `>= target`, or `items.length` when there is none. With duplicates it returns the index of the **first** equal item. It must be a binary search: on 1 000 000 items it may read at most 45 elements.
3. `eventsBetween(events, from, to)` takes events sorted by `at` (a timestamp) and returns, in order, the events with `from <= at < to` (half-open range). Use `lowerBound` twice: besides the returned events it may read at most 90 elements of a 1 000 000-event log.
