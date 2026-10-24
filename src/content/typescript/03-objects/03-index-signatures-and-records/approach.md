1. Declare the `ShirtSize` union and the `shirtPrices` constant annotated with `Record<ShirtSize, number>`.
2. Declare `StockLevels` with an index signature or `Record<string, number>`.
3. Sum with `Object.values(stock).reduce((sum, units) => sum + units, 0)`.
4. Build the restocked dictionary with spread and a computed key `[sku]`.
