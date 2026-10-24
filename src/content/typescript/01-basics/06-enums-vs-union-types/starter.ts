// TODO: replace this enum with an `as const` object and a derived union type of the same name
enum OrderStatus {
  Pending = 'pending',
  Shipped = 'shipped',
  Delivered = 'delivered',
}

function canCancel(status: OrderStatus): boolean {
  return status === OrderStatus.Pending;
}

function nextStatus(status: OrderStatus): OrderStatus {
  // TODO: pending -> shipped, shipped -> delivered, delivered stays delivered
  return status;
}
