interface Counter {
  count: number;
  step: number;
  // TODO: declare `this: Counter` on the method
  increment(): number;
}

// TODO: declare `this: Counter` as the first parameter
function increment(): number {
  // TODO: add this.step to this.count and return the new count
  return 0;
}

function createCounter(step: number): Counter {
  return { count: 0, step, increment };
}

function bindIncrement(counter: Counter): () => number {
  // TODO: returning the method directly loses `this`, keep the counter attached
  return counter.increment;
}
