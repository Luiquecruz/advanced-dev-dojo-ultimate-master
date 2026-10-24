type CssUnit = 'px' | 'rem' | '%';

type CssLength = `${number}${CssUnit}`;

type ChangeEvent<T> = `${string & keyof T}Changed`;

type ParseVersion<V> = V extends `${infer Major extends number}.${infer Minor extends number}.${infer Patch extends number}`
  ? { major: Major; minor: Minor; patch: Patch }
  : never;

function toPx<N extends number>(value: N): `${N}px` {
  return `${value}px`;
}
