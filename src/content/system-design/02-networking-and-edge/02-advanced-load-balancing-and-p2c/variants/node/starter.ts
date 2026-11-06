export interface Route {
  prefix: string;
  pool: string;
}

export function createRouter(routes: Route[]): { route(path: string): string | null } {
  function route(path: string): string | null {
    // TODO: match on segment boundaries and let the longest matching prefix win
    const match = routes.find((candidate) => path.startsWith(candidate.prefix));
    return match ? match.pool : null;
  }

  return { route };
}

export function createP2C(backends: string[], random: () => number) {
  const counts = new Map<string, number>(backends.map((name) => [name, 0]));

  function inFlight(name: string): number {
    return counts.get(name) ?? 0;
  }

  function pick(): string {
    // TODO: throw on an empty pool, sample two distinct backends and keep the less loaded one
    const chosen = backends[Math.floor(random() * backends.length)];
    counts.set(chosen, inFlight(chosen) + 1);
    return chosen;
  }

  function release(name: string): void {
    // TODO: lower the count of a known backend, never below zero
  }

  return { pick, release, inFlight };
}

const router = createRouter([
  { prefix: '/', pool: 'web' },
  { prefix: '/api', pool: 'api' },
  { prefix: '/api/v2', pool: 'api-v2' },
]);
console.log(router.route('/api/v2/orders'), router.route('/apiary'));

const balancer = createP2C(['a', 'b', 'c'], Math.random);
console.log(balancer.pick(), balancer.pick(), balancer.pick());
