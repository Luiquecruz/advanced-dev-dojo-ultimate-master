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
  basics: ['A', 'G', 'D', 'F', 'C', 'E', 'B'],
  asyncAwait: ['script start', 'run start', 'script end', 'run end', 'then'],
  nested: ['tick 1', 'promise 1', 'promise 2', 'promise from tick', 'tick from promise'],
  ioCallback: ['reading', 'tick', 'immediate', 'timeout'],
  blocking: ['loop done', 'timer late'],
};

export const queueFor: Partial<Record<Api, Queue>> = {
  'process.nextTick': 'nextTick',
  'Promise.then': 'microtask',
  queueMicrotask: 'microtask',
  setTimeout: 'timers',
  setInterval: 'timers',
  setImmediate: 'check',
  'fs.readFile callback': 'poll',
};

console.log(predictions);
