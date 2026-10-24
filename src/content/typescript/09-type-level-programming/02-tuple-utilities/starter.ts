// TODO: union of all elements
type TupleToUnion<T extends readonly unknown[]> = unknown;

// TODO: first element, never for []
type First<T extends readonly unknown[]> = unknown;

// TODO: last element, never for []
type Last<T extends readonly unknown[]> = unknown;

// TODO: length as a number literal
type Length<T extends readonly unknown[]> = number;

// TODO: reverse the tuple recursively
type Reverse<T extends readonly unknown[]> = T;

function last<const T extends readonly unknown[]>(items: T): Last<T> {
  // TODO: return the last item typed as Last<T>
  return items[0] as Last<T>;
}
