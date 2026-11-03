export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderRecord {
  id: string;
  customerEmail: string;
  status: OrderStatus;
  total: number;
  placedAt: string;
  warehouseId: string;
  paymentToken: string;
  internalNotes: string;
}

function order(id: string, customerEmail: string, status: OrderStatus, total: number, placedAt: string): OrderRecord {
  return { id, customerEmail, status, total, placedAt, warehouseId: `WH-${id.slice(-2)}`, paymentToken: `tok_${id.toLowerCase()}_secret`, internalNotes: `Picked by shift ${id.length % 3}` };
}

export const ORDERS: OrderRecord[] = [
  order('A-1001', 'ada@example.com', 'delivered', 120, '2026-01-14'),
  order('A-1002', 'ada@example.com', 'delivered', 45, '2026-02-03'),
  order('A-1003', 'ada@example.com', 'cancelled', 199, '2026-02-20'),
  order('A-1004', 'ada@example.com', 'delivered', 340, '2026-03-09'),
  order('A-1005', 'ada@example.com', 'delivered', 50, '2026-04-22'),
  order('A-1006', 'ada@example.com', 'delivered', 75, '2026-05-30'),
  order('A-1007', 'ada@example.com', 'delivered', 18, '2026-06-17'),
  order('A-1008', 'ada@example.com', 'delivered', 260, '2026-07-05'),
  order('A-1009', 'ada@example.com', 'shipped', 89, '2026-09-12'),
  order('A-1010', 'ada@example.com', 'shipped', 132, '2026-10-02'),
  order('A-1011', 'ada@example.com', 'pending', 64, '2026-10-24'),
  order('A-1012', 'ada@example.com', 'pending', 15, '2026-10-29'),
  order('G-2001', 'grace@example.com', 'delivered', 410, '2026-03-11'),
  order('G-2002', 'grace@example.com', 'shipped', 99, '2026-10-20'),
  order('G-2003', 'grace@example.com', 'pending', 23, '2026-10-30'),
  order('L-3001', 'linus@example.com', 'cancelled', 120, '2026-08-08'),
];
