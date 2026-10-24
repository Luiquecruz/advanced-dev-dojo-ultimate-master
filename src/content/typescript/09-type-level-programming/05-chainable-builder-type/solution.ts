type Simplify<T> = { [K in keyof T]: T[K] } & {};

interface Chainable<T = {}> {
  option<K extends string, V>(key: K extends keyof T ? never : K, value: V): Chainable<T & Record<K, V>>;
  get(): Simplify<T>;
}

function createChainable<T extends object = {}>(state: T = {} as T): Chainable<T> {
  return {
    option<K extends string, V>(key: K extends keyof T ? never : K, value: V): Chainable<T & Record<K, V>> {
      return createChainable({ ...state, [key]: value } as T & Record<K, V>);
    },
    get() {
      return { ...state };
    },
  };
}
