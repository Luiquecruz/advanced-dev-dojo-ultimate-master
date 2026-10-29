function checkPrediction(name: string, expected: string[], hint: string) {
  const answer = mod.predictions?.[name];
  if (!Array.isArray(answer) || answer.length === 0) {
    throw new Error(`predictions.${name} is empty: list every printed string in order.`);
  }
  if ([...answer].sort().join('|') !== [...expected].sort().join('|')) {
    throw new Error(`predictions.${name} must contain each printed string exactly once: ${expected.map((label) => `'${label}'`).sort().join(', ')}.`);
  }
  if (answer.join('|') !== expected.join('|')) {
    throw new Error(`predictions.${name} has the right strings in the wrong order. ${hint}`);
  }
}

test('basics: synchronous code first, then the nextTick queue, the microtask queue and finally the timers phase', async () => {
  checkPrediction('basics', ['A', 'G', 'D', 'F', 'C', 'E', 'B'], 'Which queue drains first after the main script, and where does queueMicrotask go?');
});

test('asyncAwait: the code after await runs as a microtask', async () => {
  checkPrediction('asyncAwait', ['script start', 'run start', 'script end', 'run end', 'then'], 'An async function runs synchronously until its first await; what is queued first, the continuation or the then?');
});

test('nested: Node alternates the nextTick and microtask queues until both are empty', async () => {
  checkPrediction('nested', ['tick 1', 'promise 1', 'promise 2', 'promise from tick', 'tick from promise'], 'A whole queue drains before Node switches to the other one; new entries join the end of their queue.');
});

test('ioCallback and blocking: setImmediate wins inside an I/O callback and a busy loop delays timers', async () => {
  checkPrediction('ioCallback', ['reading', 'tick', 'immediate', 'timeout'], 'After the poll phase comes the check phase; timers wait for the next iteration.');
  checkPrediction('blocking', ['loop done', 'timer late'], 'A timer cannot interrupt synchronous code.');
});

test('queueFor maps each API to the queue that runs its callback', async () => {
  const expected: Record<string, string> = {
    'process.nextTick': 'nextTick',
    'Promise.then': 'microtask',
    queueMicrotask: 'microtask',
    setTimeout: 'timers',
    setInterval: 'timers',
    setImmediate: 'check',
    'fs.readFile callback': 'poll',
  };
  const wrong = Object.keys(expected).filter((api) => mod.queueFor?.[api] !== expected[api]);
  if (wrong.length > 0) {
    throw new Error(`queueFor is missing or wrong for: ${wrong.join(', ')}.`);
  }
});
