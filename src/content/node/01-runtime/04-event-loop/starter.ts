export type Queue = 'nextTick' | 'microtask' | 'timers' | 'poll' | 'check';

export type Api =
  | 'process.nextTick'
  | 'Promise.then'
  | 'queueMicrotask'
  | 'setTimeout'
  | 'setInterval'
  | 'setImmediate'
  | 'fs.readFile callback';

export const predictions: Record<'basics' | 'asyncAwait' | 'nested' | 'ioCallback' | 'blocking', string[]> = {
  // TODO: list the printed strings of each snippet in the order real Node prints them
  basics: [],
  asyncAwait: [],
  nested: [],
  ioCallback: [],
  blocking: [],
};

export const queueFor: Partial<Record<Api, Queue>> = {
  // TODO: map every Api to the queue that runs its callback
};

console.log(predictions);
