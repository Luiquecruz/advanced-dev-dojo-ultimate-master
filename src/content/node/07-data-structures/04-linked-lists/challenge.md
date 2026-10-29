A real-time server keeps its open connections in a doubly linked list ordered by last activity: the head is the connection idle for the longest time. Implement the list and the expiry function.

## `ListNode<T>` (given)

`value`, `prev` and `next` (`null` when there is no neighbor).

## `LinkedList<T>`

| Member | Behavior |
| --- | --- |
| `head`, `tail` | first and last node, `null` when empty |
| `size` | number of nodes |
| `push(value): ListNode<T>` | appends a node at the tail and returns it |
| `unshift(value): ListNode<T>` | prepends a node at the head and returns it |
| `shift(): T \| undefined` | removes the head and returns its value |
| `pop(): T \| undefined` | removes the tail and returns its value |
| `remove(node): T` | removes that node in `O(1)`, sets its `prev` and `next` to `null`, returns its value |
| `moveToBack(node): void` | moves an existing node to the tail (no-op when it already is the tail) |
| `toArray(): T[]` | values from head to tail |
| `[Symbol.iterator]` | iterates the values from head to tail (`for...of`, spread) |

Removing 50 000 nodes in random order must take well under a second.

## `expireIdle(list, now, maxIdleMs)`

`list` holds `{ id: string; lastSeen: number }` values ordered by `lastSeen`. Remove from the front every connection with `now - lastSeen > maxIdleMs` and return them in order. Stop at the first connection that is not expired: do not scan the rest of the list.
