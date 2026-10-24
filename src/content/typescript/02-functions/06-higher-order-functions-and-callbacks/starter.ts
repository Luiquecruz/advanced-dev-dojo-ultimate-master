type PriceTransform = (price: number) => number;

function applyDiscount(percent: number): PriceTransform {
  // TODO: return a function that removes `percent` percent from the price
  return (price) => price;
}

function addTax(rate: number): PriceTransform {
  // TODO: return a function that adds `rate` tax to the price
  return (price) => price;
}

function pipeline(...steps: PriceTransform[]): PriceTransform {
  // TODO: apply every step from left to right
  return (price) => price;
}

// TODO: callback parameters should not be optional
function countWhere(prices: readonly number[], predicate: (price?: number, index?: number) => boolean): number {
  // TODO: count the prices accepted by the predicate
  return 0;
}
