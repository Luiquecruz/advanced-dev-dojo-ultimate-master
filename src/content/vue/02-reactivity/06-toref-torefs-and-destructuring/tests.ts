const { isRef, isReadonly, ref } = require('vue');

test('destructured items stay reactive after add()', () => {
  const { items, add } = mod.useCart();
  expect(isRef(items)).toBe(true);
  add('Book');
  add('Pen');
  expect(items.value).toEqual(['Book', 'Pen']);
});

test('writing the destructured coupon ref updates the cart state', () => {
  const { coupon, summary, add } = mod.useCart();
  add('Book');
  add('Pen');
  expect(summary.value).toBe('2 items');
  coupon.value = 'SAVE10';
  expect(summary.value).toBe('2 items with SAVE10');
});

test('itemCount is a read-only ref that follows the items', () => {
  const { itemCount, add } = mod.useCart();
  expect(isRef(itemCount)).toBe(true);
  expect(isReadonly(itemCount)).toBe(true);
  expect(itemCount.value).toBe(0);
  add('Book');
  expect(itemCount.value).toBe(1);
});

test('useLength accepts a plain string, a ref and a getter', () => {
  expect(mod.useLength('vue').value).toBe(3);
  const name = ref('Ada');
  const fromRef = mod.useLength(name);
  expect(fromRef.value).toBe(3);
  name.value = 'Grace';
  expect(fromRef.value).toBe(5);
  const state = ref({ title: 'Hi' });
  const fromGetter = mod.useLength(() => state.value.title);
  expect(fromGetter.value).toBe(2);
  state.value.title = 'Hello';
  expect(fromGetter.value).toBe(5);
});

test('uses toRefs, toRef with a getter and toValue', () => {
  expect(source).toMatch(/\.\.\.\s*toRefs\(\s*state\s*\)/);
  expect(source).toMatch(/toRef\(\s*\(\)\s*=>/);
  expect(source).toMatch(/toValue\(\s*source\s*\)/);
});
