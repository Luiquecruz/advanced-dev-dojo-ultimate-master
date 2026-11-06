export interface Route {
  prefix: string;
  pool: string;
}

function matches(prefix: string, path: string): boolean {
  return prefix === '/' || path === prefix || path.startsWith(prefix + '/');
}

export function createRouter(routes: Route[]): { route(path: string): string | null } {
  function route(path: string): string | null {
    let best: Route | null = null;
    for (const candidate of routes) {
      if (matches(candidate.prefix, path) && (best === null || candidate.prefix.length > best.prefix.length)) {
        best = candidate;
      }
    }
    return best ? best.pool : null;
  }

  return { route };
}

export function createP2C(backends: string[], random: () => number) {
  const counts = new Map<string, number>(backends.map((name) => [name, 0]));

  function inFlight(name: string): number {
    return counts.get(name) ?? 0;
  }

  function choose(): string {
    const n = backends.length;
    if (n === 0) {
      throw new Error('no backends');
    }
    if (n === 1) {
      return backends[0];
    }
    const first = Math.floor(random() * n);
    let second = Math.floor(random() * (n - 1));
    if (second >= first) {
      second += 1;
    }
    return inFlight(backends[second]) < inFlight(backends[first]) ? backends[second] : backends[first];
  }

  function pick(): string {
    const chosen = choose();
    counts.set(chosen, inFlight(chosen) + 1);
    return chosen;
  }

  function release(name: string): void {
    const current = counts.get(name);
    if (current === undefined || current === 0) {
      return;
    }
    counts.set(name, current - 1);
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
