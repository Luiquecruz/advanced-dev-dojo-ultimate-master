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

// TODO: derive these types from fetchUser, createLogger and HttpClient
type User = unknown;
type FetchUserOptions = unknown;
type Logger = unknown;
type HttpClientArgs = unknown[];

async function loadUsers(ids: number[], options: FetchUserOptions): Promise<User[]> {
  // TODO: fetch every user in parallel
  return [];
}

function createClient(...args: HttpClientArgs): HttpClient {
  // TODO: forward the arguments to the HttpClient constructor
  return new HttpClient('');
}
