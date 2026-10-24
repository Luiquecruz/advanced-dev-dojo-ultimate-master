type PriceTransform = (price: number) => number;

function applyDiscount(percent: number): PriceTransform {
  return (price) => (price * (100 - percent)) / 100;
}

function addTax(rate: number): PriceTransform {
  return (price) => price * (1 + rate);
}

function pipeline(...steps: PriceTransform[]): PriceTransform {
  return (price) => steps.reduce((current, step) => step(current), price);
}

function countWhere(prices: readonly number[], predicate: (price: number, index: number) => boolean): number {
  return prices.filter((price, index) => predicate(price, index)).length;
}
