const products = [
  { id: 1, name: 'Apple', category: 'fruit' },
  { id: 2, name: 'Pear', category: 'fruit' },
  { id: 3, name: 'Plum', category: 'fruit' },
  { id: 4, name: 'Kale', category: 'veg' },
  { id: 5, name: 'Leek', category: 'veg' },
];
const catalog = () => {
  const state = TestBed.inject(mod.CatalogState);
  state.load(products);
  return state;
};
const names = (list) => list.map((product) => product.name);

test('products and category are read-only signals with sensible defaults', () => {
  const state = catalog();
  expect(state.products()).toEqual(products);
  expect(state.category()).toBe('all');
  expect(state.products.set).toBeUndefined();
  expect(state.category.set).toBeUndefined();
});

test('filtered follows the selected category', () => {
  const state = catalog();
  expect(state.filtered()).toHaveLength(5);
  state.selectCategory('veg');
  expect(names(state.filtered())).toEqual(['Kale', 'Leek']);
});

test('visible and pageCount follow the page and the page size', () => {
  const state = catalog();
  expect(state.pageCount()).toBe(3);
  expect(names(state.visible())).toEqual(['Apple', 'Pear']);
  state.goTo(3);
  expect(names(state.visible())).toEqual(['Leek']);
  state.selectCategory('none');
  expect(state.pageCount()).toBe(1);
  expect(state.visible()).toEqual([]);
});

test('page goes back to 1 when the category changes', () => {
  const state = catalog();
  state.goTo(3);
  expect(state.page()).toBe(3);
  state.selectCategory('fruit');
  expect(state.page()).toBe(1);
});

test('the page is a linkedSignal and no effect is used', () => {
  expect(sources['catalog.ts']).toMatch(/linkedSignal\(/);
  expect(sources['catalog.ts']).not.toMatch(/\beffect\(/);
});
