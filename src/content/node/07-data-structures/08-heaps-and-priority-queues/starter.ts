export class PriorityQueue<T> {
  private readonly items: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  push(item: T): void {
    // TODO: append the item and sift it up while it comes before its parent ((index - 1) >> 1)
    this.items.push(item);
    this.items.sort(this.compare);
  }

  pop(): T | undefined {
    // TODO: take the root, move the last item to the root and sift it down towards its smaller child
    return this.items.splice(0, 1)[0];
  }

  peek(): T | undefined {
    return this.items[0];
  }

  get size(): number {
    return this.items.length;
  }
}

export interface DelayedJob {
  id: string;
  runAt: number;
}

export function takeDue(queue: PriorityQueue<DelayedJob>, now: number): DelayedJob[] {
  // TODO: pop jobs while the next one is due
  return [];
}

export function topK<T>(items: Iterable<T>, k: number, score: (item: T) => number): T[] {
  // TODO: keep a min-heap of at most k items, then pop them all and reverse
  return [];
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
