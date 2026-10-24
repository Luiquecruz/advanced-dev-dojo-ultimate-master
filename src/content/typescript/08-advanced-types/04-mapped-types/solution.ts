type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type Concrete<T> = { [K in keyof T]-?: T[K] };

type Nullable<T> = { [K in keyof T]: T[K] | null };

type FlagMap<Keys extends string> = { [K in Keys]: boolean };

function createFlags<const Keys extends string>(keys: readonly Keys[]): FlagMap<Keys> {
  return Object.fromEntries(keys.map((key) => [key, false])) as FlagMap<Keys>;
}
