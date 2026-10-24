type CssUnit = 'px' | 'rem' | '%';

// TODO: a number followed by one of the units
type CssLength = string;

// TODO: `${key}Changed` for every string key of T
type ChangeEvent<T> = string;

// TODO: parse 'major.minor.patch' into number literals
type ParseVersion<V> = { major: number; minor: number; patch: number };

function toPx<N extends number>(value: N): string {
  // TODO: return `${value}px` typed as `${N}px`
  return String(value);
}
