# Trees and Recursion

A tree is a set of nodes where each node has at most one parent and any number of children. You already work with trees every day: the DOM, a React component tree, JSON. On a backend they show up as comment threads, product categories, folder hierarchies, org charts and navigation menus.

## How trees are stored: flat rows with a parent id

Relational databases store rows, not nested objects. The common shape is an **adjacency list**: each row points to its parent.

| id | parentId | body |
| --- | --- | --- |
| 1 | null | Great article |
| 2 | 1 | Agreed |
| 3 | 2 | Same here |
| 4 | null | Typo in paragraph 2 |

The API usually needs the nested shape (`replies: [...]`). Turning the flat list into a tree is a classic interview question and a classic source of `O(n²)` code:

```ts
function children(parentId: number | null): CommentNode[] {
  return comments
    .filter((comment) => comment.parentId === parentId)
    .map((comment) => ({ ...comment, replies: children(comment.id) }));
}
```

Every call scans the whole list, once per node: `O(n²)`. With 20 000 comments on a viral post that is 400 million comparisons.

## Building the tree in O(n) with a Map

Two passes, no recursion: create every node and index it by id, then attach each node to its parent.

```ts
const nodes = new Map<number, CommentNode>();
for (const comment of comments) nodes.set(comment.id, { ...comment, replies: [] });

const roots: CommentNode[] = [];
for (const comment of comments) {
  const node = nodes.get(comment.id)!;
  const parent = comment.parentId === null ? undefined : nodes.get(comment.parentId);
  (parent ? parent.replies : roots).push(node);
}
```

The order of the rows no longer matters (a reply can appear before its parent), and every comment is visited twice. Decide explicitly what happens to **orphans** (a reply whose parent was deleted): here they become roots instead of silently disappearing.

## Recursion: the natural way to read a tree

A recursive function solves a problem by solving the same problem on smaller parts, and needs a **base case** that stops:

```ts
function countReplies(node: CommentNode): number {
  return node.replies.reduce((total, reply) => total + 1 + countReplies(reply), 0);
}
```

A leaf has no replies, so the `reduce` returns `0`: that is the base case. Each call waits on the **call stack** for its children to finish.

## The call stack has a limit

V8 allows roughly ten thousand nested calls (it depends on frame size), then throws `RangeError: Maximum call stack size exceeded`. Recursion depth equals tree depth. That is fine for categories (5 levels) and dangerous for data users control: a malicious or buggy client can create a reply chain 100 000 levels deep, and a recursive serializer will crash the request, or the process.

Any recursion can be rewritten with an **explicit stack** (an array) living on the heap, which can hold millions of entries:

```ts
const stack = roots.map((node) => ({ node, depth: 0 })).reverse();
while (stack.length > 0) {
  const { node, depth } = stack.pop()!;
  visit(node, depth);
  for (let index = node.replies.length - 1; index >= 0; index--) {
    stack.push({ node: node.replies[index], depth: depth + 1 });
  }
}
```

Children are pushed in reverse so the first child is popped first, which reproduces the recursive **depth-first pre-order** (parent, then its subtree, then the next sibling). Swap the stack for a queue and you get **breadth-first** order (level by level), useful for "show the first two levels only".

## Data can contain cycles

Bad data or a bug can make comment 5 the parent of comment 7 and 7 the parent of 5. A recursive walk never ends. Validate writes (a node cannot be moved under its own descendant) and, when reading untrusted data, track visited ids.

## Storing trees in a database

| Model | Read a subtree | Move a node | Notes |
| --- | --- | --- | --- |
| Adjacency list (`parent_id`) | recursive CTE (`WITH RECURSIVE`) or load and build in memory | update one row | simplest, the default |
| Materialized path (`/1/4/9/`) | `LIKE '/1/4/%'` with an index | rewrite the paths of the subtree | fast reads, breadcrumbs for free |
| Closure table (ancestor, descendant, depth) | one join | many rows | flexible, more storage |
| Nested sets (left/right numbers) | range query | renumber half the table | legacy, avoid for frequent writes |

## When to choose it

Return nested trees when the client renders them as such and the size is bounded (one post's comments, a menu); otherwise paginate the top level and load replies on demand. Build trees with a `Map` in `O(n)`, never with a filter per node. Use recursion when depth is small and controlled by you (categories, config); use an explicit stack, or cap the depth, when users control the shape. Let the database do subtree queries (`WITH RECURSIVE`, materialized paths) when the table is large.

## Working with AI

Tell the assistant the storage model, the expected size and the maximum depth ("up to 20 000 comments, nesting unlimited"). Review generated code for:

- `filter` by `parentId` inside a recursive function (quadratic).
- Recursion over user-controlled depth without a limit.
- Orphans silently dropped, or sibling order not defined.
- No protection against cycles when walking stored data.
- Whole trees returned without pagination for unbounded data.
