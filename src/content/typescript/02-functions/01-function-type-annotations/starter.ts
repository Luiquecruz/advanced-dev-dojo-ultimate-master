const catalog = new Map<number, number>([
  [1, 120],
  [2, 45],
  [3, 199],
]);

// TODO: replace every any with a precise type
function calculateDiscount(price: any, percent: any): any {
  return Math.round(price * (100 - percent)) / 100;
}

// TODO: annotate the parameters and the return type, then return "<currency> <amount with 2 decimals>"
const formatPrice = (amount: any, currency: any) => '';

// TODO: write async function loadPrice(productId: number): Promise<number>
