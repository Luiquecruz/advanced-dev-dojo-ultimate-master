interface Counter {
  count: number;
  step: number;
  increment(this: Counter): number;
}

function increment(this: Counter): number {
  this.count += this.step;
  return this.count;
}

function createCounter(step: number): Counter {
  return { count: 0, step, increment };
}

function bindIncrement(counter: Counter): () => number {
  return counter.increment.bind(counter);
}
