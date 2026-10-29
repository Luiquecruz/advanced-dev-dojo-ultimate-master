export interface Order {
  id: number;
  priority: 'high' | 'normal' | 'low';
  createdAt: number;
  total: number;
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;

export function sortOrders(orders: readonly Order[]): Order[] {
  // TODO: copy, then compare by priority rank, then createdAt, then id
  return [...orders];
}

export function lowerBound<T>(items: readonly T[], target: number, key: (item: T) => number = Number): number {
  // TODO: binary search over the half-open range [low, high)
  const index = items.findIndex((item) => key(item) >= target);
  return index === -1 ? items.length : index;
}

export function eventsBetween<T extends { at: number }>(events: readonly T[], from: number, to: number): T[] {
  // TODO: slice between two lower bounds on event.at
  return events.filter((event) => event.at >= from && event.at < to);
}

const orders: Order[] = [
  { id: 3, priority: 'normal', createdAt: 1_000, total: 45 },
  { id: 1, priority: 'high', createdAt: 2_000, total: 120 },
  { id: 2, priority: 'high', createdAt: 1_500, total: 340 },
  { id: 4, priority: 'low', createdAt: 500, total: 50 },
];
console.log(sortOrders(orders).map((order) => order.id));

const requestTimes = [1_000, 1_200, 1_200, 4_000, 9_500, 9_900];
const now = 10_000;
console.log(`Requests in the last 5 s: ${requestTimes.length - lowerBound(requestTimes, now - 5_000)}`);
console.log(eventsBetween([{ at: 100, type: 'login' }, { at: 200, type: 'order' }, { at: 300, type: 'logout' }], 150, 300));
