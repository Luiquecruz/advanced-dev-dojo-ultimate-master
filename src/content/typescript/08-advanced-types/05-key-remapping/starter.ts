// TODO: rename every string key k to `get${Capitalize<k>}` holding () => T[k]
type Getters<T> = T;

// TODO: keep only the properties whose value is assignable to V
type PickByValue<T, V> = T;

// TODO: one `on${Capitalize<type>}` handler per event in the union
type EventHandlers<E extends { type: string }> = Record<string, (event: E) => void>;

function createGetters<T extends object>(source: T): Getters<T> {
  // TODO: build one getter per own string key of source
  return source;
}
