type CartItem = { name: string; price: number; quantity: number };

class ShoppingCart {
  owner: string;
  // TODO: declare items as an empty CartItem array

  constructor(owner: string) {
    this.owner = owner;
  }

  add(name: string, price: number, quantity = 1): void {
    // TODO: add the item or increase the quantity of an existing one
  }

  total(): number {
    // TODO: sum price * quantity
    return 0;
  }

  count(): number {
    // TODO: sum the quantities
    return 0;
  }
}
