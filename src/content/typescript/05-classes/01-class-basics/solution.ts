type CartItem = { name: string; price: number; quantity: number };

class ShoppingCart {
  owner: string;
  items: CartItem[] = [];

  constructor(owner: string) {
    this.owner = owner;
  }

  add(name: string, price: number, quantity = 1): void {
    const existing = this.items.find((item) => item.name === name);
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    this.items.push({ name, price, quantity });
  }

  total(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  count(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
