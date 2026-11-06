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
      for (let step = 1; step <= pool.length; step++) {
        const index = (last + step) % pool.length;
        if (!down.has(pool[index])) {
          last = index;
          return pool[index];
        }
      }
      throw new Error('no healthy servers');
    },
    markDown(name) {
      if (pool.includes(name)) {
        down.add(name);
      }
    },
    markUp(name) {
      down.delete(name);
    },
    healthy() {
      return pool.filter((server) => !down.has(server));
    },
  };
}

const balancer = createRoundRobin(['a', 'b', 'c']);
console.log(balancer.next(), balancer.next(), balancer.next(), balancer.next());
balancer.markDown('c');
console.log(balancer.next(), balancer.next(), balancer.next(), balancer.healthy());
