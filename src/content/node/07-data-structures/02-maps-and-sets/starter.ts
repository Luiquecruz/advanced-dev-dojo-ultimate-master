export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Order {
  id: number;
  userId: number;
  status: 'pending' | 'paid' | 'shipped';
  total: number;
}

export function indexBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T> {
  // TODO: map key(item) to item; later items replace earlier ones
  return new Map();
}

export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  // TODO: collect the items of each key in one pass
  return new Map();
}

export function uniqueEmails(users: readonly User[]): string[] {
  // TODO: trim, lowercase and deduplicate keeping the first occurrence
  return users.map((user) => user.email);
}

export function withCustomer(orders: readonly Order[], users: readonly User[]): Array<Order & { customerName: string | null }> {
  // TODO: build an index of users once, then add customerName to a copy of each order
  return orders.map((order) => ({ ...order, customerName: users.find((user) => user.id === order.userId)?.name ?? null }));
}

export function diffIds(before: readonly number[], after: readonly number[]): { added: number[]; removed: number[] } {
  // TODO: use Sets to find the added and the removed ids
  return { added: [], removed: [] };
}

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Alan Turing', email: ' ALAN@example.com' },
  { id: 3, name: 'Ada (work)', email: 'Ada@Example.com ' },
];
const orders: Order[] = [
  { id: 10, userId: 1, status: 'paid', total: 120 },
  { id: 11, userId: 2, status: 'pending', total: 45 },
  { id: 12, userId: 1, status: 'paid', total: 199 },
];

console.log(groupBy(orders, (order) => order.status));
console.log(uniqueEmails(users));
console.log(withCustomer(orders, users));
console.log(diffIds([1, 2, 3], [2, 3, 4]));
