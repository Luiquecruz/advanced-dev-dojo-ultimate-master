const catalog = new Map<number, number>([
  [1, 120],
  [2, 45],
  [3, 199],
]);

function calculateDiscount(price: number, percent: number): number {
  return Math.round(price * (100 - percent)) / 100;
}

const formatPrice = (amount: number, currency: string): string => `${currency} ${amount.toFixed(2)}`;

async function loadPrice(productId: number): Promise<number> {
  const price = catalog.get(productId);
  if (price === undefined) {
    throw new Error(`Unknown product ${productId}`);
  }
  return price;
}
