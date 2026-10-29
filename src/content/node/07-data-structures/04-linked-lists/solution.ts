export class ListNode<T> {
  prev: ListNode<T> | null = null;
  next: ListNode<T> | null = null;

  constructor(public value: T) {}
}

export class LinkedList<T> {
  head: ListNode<T> | null = null;
  tail: ListNode<T> | null = null;
  size = 0;

  push(value: T): ListNode<T> {
    const node = new ListNode(value);
    this.append(node);
    return node;
  }

  unshift(value: T): ListNode<T> {
    const node = new ListNode(value);
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    } else {
      this.tail = node;
    }
    this.head = node;
    this.size++;
    return node;
  }

  shift(): T | undefined {
    return this.head ? this.remove(this.head) : undefined;
  }

  pop(): T | undefined {
    return this.tail ? this.remove(this.tail) : undefined;
  }

  remove(node: ListNode<T>): T {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
    node.prev = null;
    node.next = null;
    this.size--;
    return node.value;
  }

  moveToBack(node: ListNode<T>): void {
    if (node === this.tail) {
      return;
    }
    this.remove(node);
    this.append(node);
  }

  toArray(): T[] {
    return [...this];
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (let node = this.head; node; node = node.next) {
      yield node.value;
    }
  }

  private append(node: ListNode<T>): void {
    node.prev = this.tail;
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;
    }
    this.tail = node;
    this.size++;
  }
}

export interface Connection {
  id: string;
  lastSeen: number;
}

export function expireIdle(list: LinkedList<Connection>, now: number, maxIdleMs: number): Connection[] {
  const expired: Connection[] = [];
  while (list.head && now - list.head.value.lastSeen > maxIdleMs) {
    expired.push(list.shift()!);
  }
  return expired;
}

const connections = new LinkedList<Connection>();
const alice = connections.push({ id: 'alice', lastSeen: 1_000 });
connections.push({ id: 'bob', lastSeen: 2_000 });
connections.push({ id: 'carol', lastSeen: 3_000 });

alice.value.lastSeen = 4_000;
connections.moveToBack(alice);
console.log(connections.toArray().map((connection) => connection.id));
console.log(expireIdle(connections, 5_500, 2_000));
