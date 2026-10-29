const counted = <T,>(items: T[]) => {
  const reads = { count: 0 };
  const proxy = new Proxy(items, {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) reads.count++;
      return Reflect.get(target, property, receiver);
    },
  });
  return { proxy, reads };
};

test('sortOrders sorts by priority, then oldest first, then id, without mutating the input', () => {
  const orders = [
    { id: 5, priority: 'low', createdAt: 100, total: 1 },
    { id: 4, priority: 'normal', createdAt: 900, total: 1 },
    { id: 3, priority: 'high', createdAt: 1_000, total: 1 },
    { id: 2, priority: 'normal', createdAt: 90, total: 1 },
    { id: 1, priority: 'high', createdAt: 1_000, total: 1 },
    { id: 6, priority: 'high', createdAt: 20, total: 1 },
  ];
  const before = orders.map((order) => order.id);
  expect(mod.sortOrders(orders).map((order: any) => order.id)).toEqual([6, 1, 3, 2, 4, 5]);
  expect(orders.map((order) => order.id)).toEqual(before);
});

test('lowerBound returns the first index whose value is >= target', () => {
  const sorted = [2, 4, 4, 4, 7, 9];
  expect(mod.lowerBound(sorted, 4)).toBe(1);
  expect(mod.lowerBound(sorted, 5)).toBe(4);
  expect(mod.lowerBound(sorted, 1)).toBe(0);
  expect(mod.lowerBound(sorted, 9)).toBe(5);
  expect(mod.lowerBound(sorted, 10)).toBe(6);
  expect(mod.lowerBound([], 3)).toBe(0);
  expect(mod.lowerBound([{ id: 10 }, { id: 20 }, { id: 30 }], 15, (item: any) => item.id)).toBe(1);
});

test('lowerBound reads at most 45 elements of a 1 000 000-item array', () => {
  const { proxy, reads } = counted(Array.from({ length: 1_000_000 }, (_, index) => index * 2));
  expect(mod.lowerBound(proxy, 1_234_567)).toBe(617_284);
  expect(reads.count).toBeLessThanOrEqual(45);
  reads.count = 0;
  expect(mod.lowerBound(proxy, 5_000_000)).toBe(1_000_000);
  expect(reads.count).toBeLessThanOrEqual(45);
});

test('eventsBetween returns the events in the half-open range [from, to)', () => {
  const events = [100, 200, 200, 300, 400, 500].map((at, index) => ({ at, id: index }));
  expect(mod.eventsBetween(events, 200, 400).map((event: any) => event.id)).toEqual([1, 2, 3]);
  expect(mod.eventsBetween(events, 150, 151)).toEqual([]);
  expect(mod.eventsBetween(events, 0, 10_000).length).toBe(6);
  expect(mod.eventsBetween(events, 500, 501)).toEqual([events[5]]);
});

test('eventsBetween uses binary search on a 1 000 000-event log', () => {
  const { proxy, reads } = counted(Array.from({ length: 1_000_000 }, (_, index) => ({ at: index * 10 })));
  const result = mod.eventsBetween(proxy, 5_000_005, 5_000_100);
  expect(result.map((event: any) => event.at)).toEqual([5_000_010, 5_000_020, 5_000_030, 5_000_040, 5_000_050, 5_000_060, 5_000_070, 5_000_080, 5_000_090]);
  expect(reads.count).toBeLessThanOrEqual(90 + result.length);
});
