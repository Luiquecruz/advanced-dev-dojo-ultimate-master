// TODO: flatten an intersection into a single object type
type Simplify<T> = T;

interface Chainable<T = {}> {
  // TODO: make option generic, reject keys already in T and return Chainable<T & Record<K, V>>
  option(key: string, value: unknown): Chainable<T>;
  // TODO: return the simplified accumulated type
  get(): T;
}

function createChainable<T extends object = {}>(state: T = {} as T): Chainable<T> {
  return {
    // TODO: update this implementation once option is generic
    option(key: string, value: unknown): Chainable<T> {
      return createChainable({ ...state, [key]: value });
    },
    get() {
      return { ...state };
    },
  };
}
