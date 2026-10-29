export interface Comment {
  id: number;
  parentId: number | null;
  author: string;
  body: string;
}

export interface CommentNode extends Comment {
  replies: CommentNode[];
}

export function buildTree(comments: readonly Comment[]): CommentNode[] {
  // TODO: index new nodes by id in a Map, then attach each node to its parent (or to the roots)
  return [];
}

export function countReplies(node: CommentNode): number {
  // TODO: count every descendant recursively
  return node.replies.length;
}

export function flattenThread(roots: readonly CommentNode[]): Array<{ id: number; depth: number }> {
  // TODO: depth-first pre-order with an explicit stack of { node, depth }
  return roots.map((node) => ({ id: node.id, depth: 0 }));
}

const comments: Comment[] = [
  { id: 3, parentId: 2, author: 'grace', body: 'Same here' },
  { id: 1, parentId: null, author: 'ada', body: 'Great article' },
  { id: 2, parentId: 1, author: 'alan', body: 'Agreed' },
  { id: 4, parentId: null, author: 'linus', body: 'Typo in paragraph 2' },
];

const threads = buildTree(comments);
console.log(threads.map((thread) => `${thread.author}: ${countReplies(thread)} replies`));
for (const { id, depth } of flattenThread(threads)) {
  const comment = comments.find((item) => item.id === id)!;
  console.log(`${'  '.repeat(depth)}${comment.author}: ${comment.body}`);
}
