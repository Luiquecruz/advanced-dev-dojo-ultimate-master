// TODO: describe any JSON value recursively
type JsonValue = unknown;

interface TreeNode<T> {
  value: T;
  // TODO: add the recursive children property
}

// TODO: unwrap every array level
type DeepElement<T> = T;

// TODO: remove leading and trailing spaces recursively
type Trim<S extends string> = S;

function flattenTree<T>(node: TreeNode<T>): T[] {
  // TODO: collect the values depth-first
  return [node.value];
}
