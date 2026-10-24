interface OrderLine {
  productName: string;
  quantity: number;
  unitPriceInCents: number;
}

interface ShippingAddress {
  city: string;
  country: string;
}

interface Order {
  id: string;
  // TODO: add customer (name + address) and lines
}

function orderTotalInCents(order: Order): number {
  // TODO: sum quantity * unitPriceInCents for every line
  return 0;
}

function countriesWithOrders(orders: Order[]): string[] {
  // TODO: return unique countries sorted alphabetically
  return [];
}
