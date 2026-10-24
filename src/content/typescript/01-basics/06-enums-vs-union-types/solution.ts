const OrderStatus = {
  Pending: 'pending',
  Shipped: 'shipped',
  Delivered: 'delivered',
} as const;

type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

function canCancel(status: OrderStatus): boolean {
  return status === OrderStatus.Pending;
}

function nextStatus(status: OrderStatus): OrderStatus {
  if (status === OrderStatus.Pending) {
    return OrderStatus.Shipped;
  }
  return OrderStatus.Delivered;
}
