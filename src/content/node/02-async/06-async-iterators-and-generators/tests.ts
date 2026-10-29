function pagedApi(pages: Array<{ items: any[] }>) {
  const fetchPage = fn(async (cursor: string | null) => {
    const index = cursor === null ? 0 : Number(cursor.slice(1));
    return { items: pages[index].items, nextCursor: index + 1 < pages.length ? `p${index + 1}` : null };
  });
  return fetchPage;
}

async function collect(source: AsyncIterable<any>) {
  const items: any[] = [];
  for await (const item of source) items.push(item);
  return items;
}

test('paginate yields every item of every page in order, following the cursors', async () => {
  const fetchPage = pagedApi([{ items: ['a', 'b'] }, { items: ['c'] }, { items: [] }, { items: ['d', 'e'] }]);
  expect(await collect(mod.paginate(fetchPage))).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(fetchPage.mock.calls).toEqual([[null], ['p1'], ['p2'], ['p3']]);
});

test('paginate is lazy: no request before iteration and the next page only when it is needed', async () => {
  const fetchPage = pagedApi([{ items: [1, 2] }, { items: [3, 4] }, { items: [5, 6] }]);
  const items = mod.paginate(fetchPage);
  await sleep(1);
  expect(fetchPage).not.toHaveBeenCalled();
  expect(await mod.take(items, 2)).toEqual([1, 2]);
  expect(fetchPage).toHaveBeenCalledTimes(1);
  expect(await mod.take(mod.paginate(fetchPage), 3)).toEqual([1, 2, 3]);
  expect(fetchPage).toHaveBeenCalledTimes(3);
});

test('take stops the source early so its finally block runs, and returns everything for short sources', async () => {
  let closed = false;
  async function* numbers() {
    try {
      for (let n = 1; n <= 100; n++) yield n;
    } finally {
      closed = true;
    }
  }
  expect(await mod.take(numbers(), 3)).toEqual([1, 2, 3]);
  expect(closed).toBe(true);
  expect(await mod.take(mod.paginate(pagedApi([{ items: ['x'] }])), 10)).toEqual(['x']);
  expect(await mod.take(numbers(), 0)).toEqual([]);
});

test('chunk groups items into arrays of `size`, with a shorter last group', async () => {
  const fetchPage = pagedApi([{ items: [1, 2, 3] }, { items: [4, 5, 6] }, { items: [7] }]);
  expect(await collect(mod.chunk(mod.paginate(fetchPage), 2))).toEqual([[1, 2], [3, 4], [5, 6], [7]]);
  expect(await collect(mod.chunk(mod.paginate(pagedApi([{ items: [1, 2, 3, 4] }])), 2))).toEqual([[1, 2], [3, 4]]);
});

test('an error from fetchPage reaches the consumer after the earlier items', async () => {
  const seen: number[] = [];
  const fetchPage = async (cursor: string | null) => {
    if (cursor === 'p1') throw new Error('page 2 failed');
    return { items: [1, 2], nextCursor: 'p1' };
  };
  let caught: any;
  try {
    for await (const item of mod.paginate(fetchPage)) seen.push(item);
  } catch (error) {
    caught = error;
  }
  expect(seen).toEqual([1, 2]);
  expect(caught?.message).toBe('page 2 failed');
});

test('uses async generators and for await', async () => {
  expect(source).toMatch(/async\s+function\s*\*\s*paginate/);
  expect(source).toMatch(/for\s+await\s*\(/);
});
