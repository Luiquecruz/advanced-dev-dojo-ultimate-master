export interface RoundRobin {
  next(): string;
  markDown(name: string): void;
  markUp(name: string): void;
  healthy(): string[];
}

export function createRoundRobin(servers: string[]): RoundRobin {
  const pool = [...servers];
  const down = new Set<string>();
  let last = -1;

  return {
    next() {
      // TODO: skip servers marked down, and throw 'no healthy servers' when none is left
      last = (last + 1) % pool.length;
      return pool[last];
    },
    markDown(name) {
      // TODO: take the server out of the rotation
    },
    markUp(name) {
      // TODO: put the server back into the rotation
    },
    healthy() {
      // TODO: only the servers that are not marked down
      return pool;
    },
  };
}

const balancer = createRoundRobin(['a', 'b', 'c']);
console.log(balancer.next(), balancer.next(), balancer.next(), balancer.next());
balancer.markDown('c');
console.log(balancer.next(), balancer.next(), balancer.next(), balancer.healthy());
