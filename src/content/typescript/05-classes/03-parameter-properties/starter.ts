class Product {
  // TODO: replace these declarations and assignments with parameter properties
  id: number;
  name: string;
  priceInCents: number;

  constructor(id: number, name: string, priceInCents: number) {
    this.id = id;
    this.name = name;
    this.priceInCents = priceInCents;
  }

  formattedPrice(): string {
    return `$${(this.priceInCents / 100).toFixed(2)}`;
  }

  applyDiscount(percent: number): void {
    // TODO: reduce priceInCents by percent, rounded to the nearest cent
  }
}
