type ShirtSize = 'small' | 'medium' | 'large';

const shirtPrices: Record<ShirtSize, number> = {
  small: 19.9,
  medium: 21.9,
  large: 23.9,
};

type StockLevels = { [sku: string]: number };

function totalUnits(stock: StockLevels): number {
  return Object.values(stock).reduce((sum, units) => sum + units, 0);
}

function restock(stock: StockLevels, sku: string, amount: number): StockLevels {
  return { ...stock, [sku]: (stock[sku] ?? 0) + amount };
}
