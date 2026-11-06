test('cosine similarity measures direction only and returns 0 for a zero-length vector', () => {
  expect(mod.cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 6);
  expect(mod.cosineSimilarity([1, 0], [0, 3])).toBeCloseTo(0, 6);
  expect(mod.cosineSimilarity([1, 2], [-2, -4])).toBeCloseTo(-1, 6);
  expect(mod.cosineSimilarity([1, 2], [3, 6])).toBeCloseTo(1, 6);
  expect(mod.cosineSimilarity([3, 4], [4, 3])).toBeCloseTo(0.96, 6);
  expect(mod.cosineSimilarity([0, 0], [1, 1])).toBe(0);
});

// beginner mistake: ranking by a raw dot product, so a long vector outranks one in the query's exact direction
test('exact search ranks by direction, not by vector length', () => {
  const items = [
    { id: 'long-but-off', vector: [10, 10] },
    { id: 'short-and-exact', vector: [1, 0] },
  ];
  expect(mod.exactSearch(items, [1, 0], 2)).toEqual(['short-and-exact', 'long-but-off']);
  expect(mod.exactSearch(items, [2, 0], 1)).toEqual(['short-and-exact']);
});

test('exact search returns the top k, breaks ties by id and returns every id when k is large', () => {
  const items = [
    { id: 'b', vector: [1, 0] },
    { id: 'd', vector: [-1, 0] },
    { id: 'a', vector: [2, 0] },
    { id: 'c', vector: [0, 1] },
  ];
  expect(mod.exactSearch(items, [1, 0], 2)).toEqual(['a', 'b']);
  expect(mod.exactSearch(items, [1, 0], 10)).toEqual(['a', 'b', 'c', 'd']);
});

test('the IVF index stores each vector in the list of its most similar centroid, the lowest index on a tie', () => {
  const index = mod.createIvfIndex([[1, 0], [0, 1], [-1, 0]]);
  index.add('east', [5, 1]);
  index.add('north', [0.2, 3]);
  index.add('west', [-2, -0.5]);
  index.add('north-east', [0.6, 0.8]);
  index.add('also-east', [1, 0.2]);
  expect(index.listSizes()).toEqual([2, 2, 1]);
  index.add('diagonal', [1, 1]);
  expect(index.listSizes()).toEqual([3, 2, 1]);
});

test('IVF search only probes the nprobe nearest lists and matches exact search when it probes them all', () => {
  const index = mod.createIvfIndex([[1, 0], [0, 1]]);
  index.add('x', [1, 0.1]);
  index.add('y', [0.6, 0.8]);
  index.add('z', [0, 1]);
  expect(index.search([0.8, 0.6], 2, 1)).toEqual(['x']);
  expect(index.search([0.8, 0.6], 2, 2)).toEqual(['y', 'x']);
  expect(index.search([0.8, 0.6], 3, 2)).toEqual(['y', 'x', 'z']);
});
