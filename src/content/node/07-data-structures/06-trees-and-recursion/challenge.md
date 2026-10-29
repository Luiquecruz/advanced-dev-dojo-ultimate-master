The comments API loads a post's comments as flat rows and must return threads.

```ts
interface Comment { id: number; parentId: number | null; author: string; body: string }
interface CommentNode extends Comment { replies: CommentNode[] }
```

1. `buildTree(comments): CommentNode[]` returns the root comments with nested `replies`.
   - Every node is a **new** object with all the comment fields plus `replies` (the input rows are not modified).
   - Siblings keep the order of the input array. A reply may appear in the input **before** its parent.
   - A comment whose `parentId` is `null` **or** points to an id that does not exist is a root.
   - It must be `O(n)`: 100 000 comments are built in a fraction of a second, and a 100 000-level reply chain must not overflow the call stack.
2. `countReplies(node): number` returns the number of descendants of a node (replies, their replies, and so on). Recursion is fine here: it is only used on bounded threads.
3. `flattenThread(roots): Array<{ id: number; depth: number }>` lists every node in depth-first pre-order (a node, then its replies in order, then its next sibling), with `depth` 0 for roots. It must handle a 100 000-level-deep thread, so use an explicit stack instead of recursion.
