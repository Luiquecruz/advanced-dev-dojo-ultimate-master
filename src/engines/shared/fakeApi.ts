type Handler = (request: { url: URL; method: string; body: any }) => unknown | Promise<unknown>;

const users = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'editor' },
  { id: 3, name: 'Grace Hopper', email: 'grace@example.com', role: 'viewer' },
  { id: 4, name: 'Linus Torvalds', email: 'linus@example.com', role: 'editor' },
  { id: 5, name: 'Margaret Hamilton', email: 'margaret@example.com', role: 'admin' },
];

const posts = [
  { id: 1, userId: 1, title: 'Notes on the Analytical Engine', body: 'The engine weaves algebraic patterns.' },
  { id: 2, userId: 2, title: 'Computing Machinery and Intelligence', body: 'Can machines think?' },
  { id: 3, userId: 3, title: 'The first bug', body: 'A moth was found in relay #70.' },
  { id: 4, userId: 5, title: 'Apollo guidance', body: 'Priority displays saved the landing.' },
];

const initialTodos = () => [
  { id: 1, title: 'Learn JSX', completed: true },
  { id: 2, title: 'Master hooks', completed: false },
  { id: 3, title: 'Ship a React app', completed: false },
];

const products = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
  { id: 4, name: 'Monitor', price: 340, category: 'hardware' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];

let todos = initialTodos();
let delay = 250;
let overrides: Array<{ match: RegExp | string; handler: Handler }> = [];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function notFound(): Response {
  return json({ error: 'Not found' }, 404);
}

function route(url: URL, method: string, body: any): Response {
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '');
  const [, resource, id] = path.split('/');

  if (resource === 'users') {
    if (!id) return json(users);
    const user = users.find((entry) => entry.id === Number(id));
    return user ? json(user) : notFound();
  }
  if (resource === 'posts') {
    if (!id) {
      const userId = url.searchParams.get('userId');
      return json(userId ? posts.filter((post) => post.userId === Number(userId)) : posts);
    }
    const post = posts.find((entry) => entry.id === Number(id));
    return post ? json(post) : notFound();
  }
  if (resource === 'products') {
    const query = (url.searchParams.get('q') ?? '').toLowerCase();
    return json(products.filter((product) => product.name.toLowerCase().includes(query)));
  }
  if (resource === 'search') {
    const query = (url.searchParams.get('q') ?? '').toLowerCase();
    return json(users.filter((user) => user.name.toLowerCase().includes(query)));
  }
  if (resource === 'todos') {
    if (method === 'GET') return json(id ? todos.find((todo) => todo.id === Number(id)) : todos);
    if (method === 'POST') {
      const todo = { id: Math.max(0, ...todos.map((entry) => entry.id)) + 1, completed: false, ...body };
      todos = [...todos, todo];
      return json(todo, 201);
    }
    if (method === 'PATCH' || method === 'PUT') {
      todos = todos.map((todo) => (todo.id === Number(id) ? { ...todo, ...body } : todo));
      return json(todos.find((todo) => todo.id === Number(id)));
    }
    if (method === 'DELETE') {
      todos = todos.filter((todo) => todo.id !== Number(id));
      return json({ ok: true });
    }
  }
  if (resource === 'error') {
    return json({ error: 'Something went wrong' }, 500);
  }
  return notFound();
}

/**
 * Installs a fake REST API served from /api/* (and https://api.example.com/*).
 */
export function installFakeApi(target: typeof globalThis, options: { delay: number }): void {
  delay = options.delay;
  const realFetch = target.fetch?.bind(target);
  const base = target.location?.origin && target.location.origin !== 'null' ? target.location.origin : 'http://localhost';

  target.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, base);
    const isFake = url.pathname.startsWith('/api/') || url.hostname === 'api.example.com';
    if (!isFake) {
      if (!realFetch) throw new TypeError(`fetch is not available for ${raw}`);
      return realFetch(input, init);
    }
    const request = input instanceof Request ? input : undefined;
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const rawBody = init?.body ?? (request && method !== 'GET' && method !== 'HEAD' ? await request.clone().text() : undefined);
    const body = typeof rawBody === 'string' ? (rawBody === '' ? undefined : safeParse(rawBody)) : rawBody;
    const signal = init?.signal ?? request?.signal;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });

    const override = overrides.find(({ match }) => (typeof match === 'string' ? url.pathname.includes(match) : match.test(url.href)));
    if (override) {
      const result = await override.handler({ url, method, body });
      return result instanceof Response ? result : json(result);
    }
    return route(url, method, body);
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Overrides a fake API route inside a test.
 */
export function mockApi(match: RegExp | string, handler: Handler | unknown): void {
  overrides.unshift({ match, handler: typeof handler === 'function' ? (handler as Handler) : () => handler });
}

/**
 * Restores the fake API to its initial data.
 */
export function resetFakeApi(): void {
  overrides = [];
  todos = initialTodos();
}

export { json as jsonResponse };
