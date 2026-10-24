type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type EventHandlers<E extends { type: string }> = {
  [Event in E as `on${Capitalize<Event['type']>}`]: (event: Event) => void;
};

function createGetters<T extends object>(source: T): Getters<T> {
  const getters: Record<string, () => unknown> = {};
  for (const key of Object.keys(source)) {
    const name = `get${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    getters[name] = () => source[key as keyof T];
  }
  return getters as Getters<T>;
}
