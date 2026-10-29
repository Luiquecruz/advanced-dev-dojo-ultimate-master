export class PriorityQueue<T> {
  private readonly items: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  push(item: T): void {
    const { items } = this;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.compare(items[index], items[parent]) >= 0) {
        return;
      }
      [items[index], items[parent]] = [items[parent], items[index]];
      index = parent;
    }
  }

  pop(): T | undefined {
    const { items } = this;
    if (items.length === 0) {
      return undefined;
    }
    const first = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      this.siftDown(0);
    }
    return first;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  get size(): number {
    return this.items.length;
  }

  private siftDown(start: number): void {
    const { items } = this;
    let index = start;
    while (true) {
      const left = 2 * index + 1;
      const right = left + 1;
      let first = index;
      if (left < items.length && this.compare(items[left], items[first]) < 0) {
        first = left;
      }
      if (right < items.length && this.compare(items[right], items[first]) < 0) {
        first = right;
      }
      if (first === index) {
        return;
      }
      [items[index], items[first]] = [items[first], items[index]];
      index = first;
    }
  }
}

export interface DelayedJob {
  id: string;
  runAt: number;
}

export function takeDue(queue: PriorityQueue<DelayedJob>, now: number): DelayedJob[] {
  const due: DelayedJob[] = [];
  while (queue.size > 0 && queue.peek()!.runAt <= now) {
    due.push(queue.pop()!);
  }
  return due;
}

export function topK<T>(items: Iterable<T>, k: number, score: (item: T) => number): T[] {
  if (k <= 0) {
    return [];
  }
  const heap = new PriorityQueue<T>((a, b) => score(a) - score(b));
  for (const item of items) {
    heap.push(item);
    if (heap.size > k) {
      heap.pop();
    }
  }
  const result: T[] = [];
  while (heap.size > 0) {
    result.push(heap.pop()!);
  }
  return result.reverse();
}

const jobs = new PriorityQueue<DelayedJob>((a, b) => a.runAt - b.runAt);
jobs.push({ id: 'send-digest', runAt: 3_000 });
jobs.push({ id: 'retry-webhook', runAt: 1_000 });
jobs.push({ id: 'expire-trial', runAt: 2_000 });
console.log(takeDue(jobs, 2_500));

const requests = [
  { path: '/orders', ms: 120 },
  { path: '/health', ms: 2 },
  { path: '/reports', ms: 870 },
  { path: '/users', ms: 45 },
];
console.log(topK(requests, 2, (request) => request.ms));
