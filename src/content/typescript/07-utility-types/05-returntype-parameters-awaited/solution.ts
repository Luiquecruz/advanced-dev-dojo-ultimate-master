async function fetchUser(id: number, options: { includePosts: boolean }) {
  return { id, name: `User ${id}`, posts: options.includePosts ? [`Post by ${id}`] : [] };
}

function createLogger(prefix: string, level: 'info' | 'debug' = 'info') {
  return {
    prefix,
    level,
    format(message: string) {
      return `[${prefix}] ${message}`;
    },
  };
}

class HttpClient {
  constructor(
    readonly baseUrl: string,
    readonly timeoutMs = 5000,
  ) {}
}

type User = Awaited<ReturnType<typeof fetchUser>>;
type FetchUserOptions = Parameters<typeof fetchUser>[1];
type Logger = ReturnType<typeof createLogger>;
type HttpClientArgs = ConstructorParameters<typeof HttpClient>;

async function loadUsers(ids: number[], options: FetchUserOptions): Promise<User[]> {
  return Promise.all(ids.map((id) => fetchUser(id, options)));
}

function createClient(...args: HttpClientArgs): HttpClient {
  return new HttpClient(...args);
}
