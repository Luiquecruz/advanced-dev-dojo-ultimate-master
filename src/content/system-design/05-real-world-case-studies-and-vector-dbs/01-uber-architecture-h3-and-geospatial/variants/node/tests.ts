test('the cell id floors latitude and longitude divided by the cell size, also for negative coordinates', () => {
  const index = mod.createGridIndex({ cellSizeDegrees: 0.5 });
  expect(index.cellOf(10.2, 20.7)).toBe('20:41');
  expect(index.cellOf(0.1, 0.1)).toBe('0:0');
  expect(index.cellOf(-0.1, -0.1)).toBe('-1:-1');
  expect(index.cellOf(-10.6, 30.25)).toBe('-22:60');
});

test('nearby reads the cell alone for 0 rings and the 3 x 3 block for 1 ring, sorted', () => {
  const index = mod.createGridIndex({ cellSizeDegrees: 1 });
  index.upsert('center', 10.5, 20.5);
  index.upsert('north', 11.5, 20.5);
  index.upsert('diagonal', 9.5, 19.5);
  index.upsert('far', 12.5, 20.5);
  index.upsert('also-center', 10.9, 20.1);
  expect(index.nearby(10.5, 20.5, 0)).toEqual(['also-center', 'center']);
  expect(index.nearby(10.5, 20.5, 1)).toEqual(['also-center', 'center', 'diagonal', 'north']);
  expect(index.nearby(10.5, 20.5, 2)).toEqual(['also-center', 'center', 'diagonal', 'far', 'north']);
});

// beginner mistake: adding a driver to the new cell without removing them from the old one
test('a driver who moves is found only in the new cell and the old cell loses its supply', () => {
  const index = mod.createGridIndex({ cellSizeDegrees: 1 });
  index.upsert('driver-a', 10.5, 20.5);
  index.upsert('driver-b', 10.5, 20.5);
  index.upsert('driver-a', 40.5, 50.5);
  expect(index.nearby(10.5, 20.5, 0)).toEqual(['driver-b']);
  expect(index.nearby(40.5, 50.5, 0)).toEqual(['driver-a']);
  expect(index.countIn('10:20')).toBe(1);
  expect(index.countIn('40:50')).toBe(1);
  index.upsert('driver-a', 40.6, 50.6);
  expect(index.nearby(40.5, 50.5, 1)).toEqual(['driver-a']);
});

test('remove takes a driver out of the index and returns false for an unknown driver', () => {
  const index = mod.createGridIndex({ cellSizeDegrees: 1 });
  index.upsert('driver-a', 10.5, 20.5);
  expect(index.remove('driver-a')).toBe(true);
  expect(index.remove('driver-a')).toBe(false);
  expect(index.remove('ghost')).toBe(false);
  expect(index.nearby(10.5, 20.5, 1)).toEqual([]);
  expect(index.countIn('10:20')).toBe(0);
});
