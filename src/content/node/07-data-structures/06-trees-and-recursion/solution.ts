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
  const nodes = new Map<number, CommentNode>();
  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }
  const roots: CommentNode[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId === null ? undefined : nodes.get(comment.parentId);
    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function countReplies(node: CommentNode): number {
  return node.replies.reduce((total, reply) => total + 1 + countReplies(reply), 0);
}

export function flattenThread(roots: readonly CommentNode[]): Array<{ id: number; depth: number }> {
  const result: Array<{ id: number; depth: number }> = [];
  const stack = roots.map((node) => ({ node, depth: 0 })).reverse();
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    result.push({ id: node.id, depth });
    for (let index = node.replies.length - 1; index >= 0; index--) {
      stack.push({ node: node.replies[index], depth: depth + 1 });
    }
  }
  return result;
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
