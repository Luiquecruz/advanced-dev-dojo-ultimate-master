class Product {
  constructor(
    readonly id: number,
    public name: string,
    private priceInCents: number,
  ) {}

  formattedPrice(): string {
    return `$${(this.priceInCents / 100).toFixed(2)}`;
  }

  applyDiscount(percent: number): void {
    this.priceInCents = Math.round(this.priceInCents * (1 - percent / 100));
  }
}
