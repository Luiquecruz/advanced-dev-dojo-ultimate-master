type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
}

type DeepElement<T> = T extends readonly (infer Item)[] ? DeepElement<Item> : T;

type Trim<S extends string> = S extends ` ${infer Rest}`
  ? Trim<Rest>
  : S extends `${infer Rest} `
    ? Trim<Rest>
    : S;

function flattenTree<T>(node: TreeNode<T>): T[] {
  return [node.value, ...node.children.flatMap((child) => flattenTree(child))];
}
