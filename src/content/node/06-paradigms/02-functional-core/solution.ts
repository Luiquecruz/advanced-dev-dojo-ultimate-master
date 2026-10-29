export interface CartItem {
  sku: string;
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  items: readonly CartItem[];
}

export interface PriceSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export type PricingRule = (summary: PriceSummary) => PriceSummary;

export function addItem(cart: Cart, item: CartItem): Cart {
  const exists = cart.items.some((current) => current.sku === item.sku);
  const items = exists
    ? cart.items.map((current) => (current.sku === item.sku ? { ...current, quantity: current.quantity + item.quantity } : current))
    : [...cart.items, item];
  return { ...cart, items };
}

export function removeItem(cart: Cart, sku: string): Cart {
  return { ...cart, items: cart.items.filter((item) => item.sku !== sku) };
}

export function subtotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function pipe<T>(...fns: Array<(value: T) => T>): (value: T) => T {
  return (value) => fns.reduce((acc, fn) => fn(acc), value);
}

export function percentOff(percent: number): PricingRule {
  return (summary) => ({ ...summary, discount: summary.discount + Math.round((summary.subtotal * percent) / 100) });
}

export function freeShippingOver(threshold: number): PricingRule {
  return (summary) => (summary.subtotal >= threshold ? { ...summary, shipping: 0 } : summary);
}

export function priceCart(cart: Cart, rules: PricingRule[] = [], shipping = 500): PriceSummary {
  const priced = pipe(...rules)({ subtotal: subtotal(cart), discount: 0, shipping, total: 0 });
  return { ...priced, total: Math.max(0, priced.subtotal - priced.discount) + priced.shipping };
}

function main() {
  const cart = addItem(addItem({ items: [] }, { sku: 'keyboard', unitPrice: 12000, quantity: 1 }), { sku: 'mouse', unitPrice: 4500, quantity: 2 });
  console.log(priceCart(cart, [percentOff(10), freeShippingOver(20000)]));
}

main();
