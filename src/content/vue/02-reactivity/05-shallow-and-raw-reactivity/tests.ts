const { computed, isProxy, isReactive, isRef, isShallow } = require('vue');

test('points is a shallowRef and its items are not proxied', () => {
  expect(isRef(mod.points)).toBe(true);
  expect(isShallow(mod.points)).toBe(true);
  mod.addPoint({ x: 1, y: 2 });
  expect(isReactive(mod.points.value[0])).toBe(false);
});

test('addPoint replaces the array and notifies dependents', () => {
  const count = computed(() => mod.points.value.length);
  expect(count.value).toBe(0);
  const before = mod.points.value;
  mod.addPoint({ x: 1, y: 2 });
  expect(mod.points.value).not.toBe(before);
  expect(count.value).toBe(1);
  mod.addPoint({ x: 3, y: 4 });
  expect(mod.points.value).toEqual([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
});

test('movePoint mutates in place and triggers dependents with triggerRef', () => {
  mod.addPoint({ x: 1, y: 2 });
  const array = mod.points.value;
  const first = mod.points.value[0];
  const firstX = computed(() => mod.points.value[0].x);
  expect(firstX.value).toBe(1);
  mod.movePoint(0, 5, 6);
  expect(mod.points.value).toBe(array);
  expect(mod.points.value[0]).toBe(first);
  expect(first).toEqual({ x: 5, y: 6 });
  expect(firstX.value).toBe(5);
  expect(source).toMatch(/triggerRef\(\s*points\s*\)/);
});

test('keeps the ChartEngine instance raw inside reactive state', () => {
  expect(isReactive(mod.chart)).toBe(true);
  expect(isProxy(mod.chart.engine)).toBe(false);
  expect(mod.chart.engine).toBeInstanceOf(mod.ChartEngine);
  expect(mod.chart.engine.render([{ x: 0, y: 0 }])).toBe(1);
  expect(mod.chart.engine.renders).toBe(1);
});

test('snapshotSettings returns a plain deep copy', () => {
  const snapshot = mod.snapshotSettings();
  expect(isProxy(snapshot)).toBe(false);
  expect(snapshot).toEqual({ theme: 'dark', grid: { visible: true, size: 8 } });
  mod.settings.grid.size = 16;
  expect(snapshot.grid.size).toBe(8);
  expect(source).toMatch(/toRaw\(\s*settings\s*\)/);
});
