// TODO: remove readonly from every property
type Mutable<T> = T;

// TODO: make every property required
type Concrete<T> = T;

// TODO: allow null in every property, keeping modifiers
type Nullable<T> = T;

// TODO: one boolean property per key
type FlagMap<Keys extends string> = Record<string, boolean>;

function createFlags<const Keys extends string>(keys: readonly Keys[]): FlagMap<Keys> {
  // TODO: build an object with every key set to false
  return {} as FlagMap<Keys>;
}
