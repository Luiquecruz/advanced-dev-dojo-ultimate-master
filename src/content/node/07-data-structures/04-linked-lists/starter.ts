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
    node.prev = this.tail;
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;
    }
    this.tail = node;
    this.size++;
    return node;
  }

  unshift(value: T): ListNode<T> {
    // TODO: link a new node before the current head
    return new ListNode(value);
  }

  shift(): T | undefined {
    // TODO: remove the head and return its value
    return undefined;
  }

  pop(): T | undefined {
    // TODO: remove the tail and return its value
    return undefined;
  }

  remove(node: ListNode<T>): T {
    // TODO: relink the neighbors (or head/tail), clear node.prev/next, update size
    return node.value;
  }

  moveToBack(node: ListNode<T>): void {
    // TODO: move the node to the tail
  }

  toArray(): T[] {
    return [...this];
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (let node = this.head; node; node = node.next) {
      yield node.value;
    }
  }
}

export interface Connection {
  id: string;
  lastSeen: number;
}

export function expireIdle(list: LinkedList<Connection>, now: number, maxIdleMs: number): Connection[] {
  // TODO: shift expired connections from the front and stop at the first active one
  return [];
}

const connections = new LinkedList<Connection>();
const alice = connections.push({ id: 'alice', lastSeen: 1_000 });
connections.push({ id: 'bob', lastSeen: 2_000 });
connections.push({ id: 'carol', lastSeen: 3_000 });

alice.value.lastSeen = 4_000;
connections.moveToBack(alice);
console.log(connections.toArray().map((connection) => connection.id));
console.log(expireIdle(connections, 5_500, 2_000));
