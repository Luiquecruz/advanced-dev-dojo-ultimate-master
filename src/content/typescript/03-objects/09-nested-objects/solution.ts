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
  customer: { name: string; address: ShippingAddress };
  lines: OrderLine[];
}

function orderTotalInCents(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceInCents, 0);
}

function countriesWithOrders(orders: Order[]): string[] {
  return [...new Set(orders.map((order) => order.customer.address.country))].sort();
}
