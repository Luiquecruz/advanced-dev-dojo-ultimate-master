const deepFreeze = (value: any): any => {
  Object.values(value).forEach((child) => typeof child === 'object' && child !== null && deepFreeze(child));
  return Object.freeze(value);
};
const keyboard = { sku: 'keyboard', unitPrice: 12000, quantity: 1 };
const mouse = { sku: 'mouse', unitPrice: 4500, quantity: 2 };

test('addItem appends new skus and merges the quantity of an existing sku without mutating the cart', () => {
  const cart = deepFreeze({ items: [{ ...keyboard }, { ...mouse }] });
  const merged = mod.addItem(cart, { sku: 'mouse', unitPrice: 4500, quantity: 3 });
  expect(merged.items).toEqual([keyboard, { ...mouse, quantity: 5 }]);
  const appended = mod.addItem(cart, { sku: 'cable', unitPrice: 900, quantity: 1 });
  expect(appended.items.map((item: any) => item.sku)).toEqual(['keyboard', 'mouse', 'cable']);
  expect(merged).not.toBe(cart);
  expect(cart.items[1].quantity).toBe(2);
});

test('removeItem returns a cart without the sku and leaves the original untouched', () => {
  const cart = deepFreeze({ items: [{ ...keyboard }, { ...mouse }] });
  expect(mod.removeItem(cart, 'keyboard').items).toEqual([mouse]);
  expect(cart.items).toHaveLength(2);
});

test('pipe applies functions from left to right and pipe() is the identity', () => {
  expect(mod.pipe((x: number) => x + 1, (x: number) => x * 2)(3)).toBe(8);
  expect(mod.pipe((x: string) => x.trim(), (x: string) => x.toUpperCase())('  ada ')).toBe('ADA');
  expect(mod.pipe()(42)).toBe(42);
});

test('priceCart charges 500 shipping by default and computes the total', () => {
  const cart = deepFreeze({ items: [{ ...keyboard }, { ...mouse }] });
  expect(mod.priceCart(cart)).toEqual({ subtotal: 21000, discount: 0, shipping: 500, total: 21500 });
  expect(mod.priceCart(cart, [], 900).total).toBe(21900);
});

test('percentOff and freeShippingOver compose in order through priceCart', () => {
  const cart = deepFreeze({ items: [{ sku: 'cable', unitPrice: 999, quantity: 3 }] });
  expect(mod.priceCart(cart, [mod.percentOff(10)])).toEqual({ subtotal: 2997, discount: 300, shipping: 500, total: 3197 });
  expect(mod.priceCart(cart, [mod.percentOff(10), mod.percentOff(5), mod.freeShippingOver(2000)])).toEqual({ subtotal: 2997, discount: 450, shipping: 0, total: 2547 });
  expect(mod.priceCart(cart, [mod.freeShippingOver(5000)]).shipping).toBe(500);
});

test('rules are pure: they return a new summary and never touch the one they receive', () => {
  const summary = deepFreeze({ subtotal: 10000, discount: 0, shipping: 500, total: 0 });
  const discounted = mod.percentOff(20)(summary);
  expect(discounted).toEqual({ subtotal: 10000, discount: 2000, shipping: 500, total: 0 });
  expect(discounted).not.toBe(summary);
  expect(mod.percentOff(20)(summary)).toEqual(discounted);
  expect(mod.freeShippingOver(5000)(summary)).toEqual({ ...summary, shipping: 0 });
});
