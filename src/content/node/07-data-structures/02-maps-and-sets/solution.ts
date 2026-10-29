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
  const index = new Map<K, T>();
  for (const item of items) {
    index.set(key(item), item);
  }
  return index;
}

export function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return groups;
}

export function uniqueEmails(users: readonly User[]): string[] {
  return [...new Set(users.map((user) => user.email.trim().toLowerCase()))];
}

export function withCustomer(orders: readonly Order[], users: readonly User[]): Array<Order & { customerName: string | null }> {
  const usersById = indexBy(users, (user) => user.id);
  return orders.map((order) => ({ ...order, customerName: usersById.get(order.userId)?.name ?? null }));
}

export function diffIds(before: readonly number[], after: readonly number[]): { added: number[]; removed: number[] } {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter((id) => !beforeSet.has(id)),
    removed: before.filter((id) => !afterSet.has(id)),
  };
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
