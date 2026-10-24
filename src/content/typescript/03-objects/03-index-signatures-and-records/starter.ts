// TODO: replace string with the union 'small' | 'medium' | 'large'
type ShirtSize = string;

// TODO: annotate with Record<ShirtSize, number> and fill in every size
const shirtPrices = {};

// TODO: map any SKU string to a number of units
type StockLevels = {};

function totalUnits(stock: StockLevels): number {
  // TODO: sum every value of the dictionary
  return 0;
}

function restock(stock: StockLevels, sku: string, amount: number): StockLevels {
  // TODO: return a new dictionary with amount added to sku
  return stock;
}
