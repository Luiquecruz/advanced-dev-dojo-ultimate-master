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
  // TODO: return a new cart; merge the quantity when the sku already exists, append otherwise
  return cart;
}

export function removeItem(cart: Cart, sku: string): Cart {
  // TODO: return a new cart without the sku
  return cart;
}

export function subtotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function pipe<T>(...fns: Array<(value: T) => T>): (value: T) => T {
  // TODO: apply fns from left to right
  return (value) => value;
}

export function percentOff(percent: number): PricingRule {
  // TODO: return a rule that adds Math.round(subtotal * percent / 100) to the discount
  return (summary) => summary;
}

export function freeShippingOver(threshold: number): PricingRule {
  // TODO: return a rule that sets shipping to 0 when subtotal >= threshold
  return (summary) => summary;
}

export function priceCart(cart: Cart, rules: PricingRule[] = [], shipping = 500): PriceSummary {
  // TODO: build the base summary, apply the rules with pipe and compute the total
  return { subtotal: subtotal(cart), discount: 0, shipping, total: 0 };
}

function main() {
  const cart = addItem(addItem({ items: [] }, { sku: 'keyboard', unitPrice: 12000, quantity: 1 }), { sku: 'mouse', unitPrice: 4500, quantity: 2 });
  console.log(priceCart(cart, [percentOff(10), freeShippingOver(20000)]));
}

main();
