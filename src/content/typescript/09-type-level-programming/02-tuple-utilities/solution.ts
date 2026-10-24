type TupleToUnion<T extends readonly unknown[]> = T[number];

type First<T extends readonly unknown[]> = T extends readonly [infer Head, ...unknown[]] ? Head : never;

type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer Tail] ? Tail : never;

type Length<T extends readonly unknown[]> = T['length'];

type Reverse<T extends readonly unknown[]> = T extends readonly [infer Head, ...infer Rest]
  ? [...Reverse<Rest>, Head]
  : [];

function last<const T extends readonly unknown[]>(items: T): Last<T> {
  return items[items.length - 1] as Last<T>;
}
