type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'triangle'; base: number; height: number };

// TODO: accept only never and throw "Unexpected value: <json>"
function assertNever(value: unknown): never {
  throw new Error('Not implemented');
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.side ** 2;
    // TODO: handle triangles and make the default branch exhaustive with assertNever
    default:
      return 0;
  }
}
