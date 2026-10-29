export interface User {
  id: number;
  name: string;
}

export interface Post {
  id: number;
  authorId: number;
  title: string;
}

export interface Database {
  queries: string[];
  findPosts(): Promise<Post[]>;
  findUserById(id: number): Promise<User | null>;
  findUsersByIds(ids: number[]): Promise<User[]>;
}

export function createDatabase(): Database {
  const users: User[] = [
    { id: 3, name: 'Grace Hopper' },
    { id: 1, name: 'Ada Lovelace' },
    { id: 2, name: 'Alan Turing' },
  ];
  const posts: Post[] = [
    { id: 1, authorId: 1, title: 'Notes on the Analytical Engine' },
    { id: 2, authorId: 2, title: 'Computing Machinery and Intelligence' },
    { id: 3, authorId: 1, title: 'Poetical Science' },
    { id: 4, authorId: 3, title: 'The First Compiler' },
    { id: 5, authorId: 9, title: 'Post by a deleted user' },
  ];
  const queries: string[] = [];
  return {
    queries,
    async findPosts() {
      queries.push('SELECT * FROM posts');
      return posts.map((post) => ({ ...post }));
    },
    async findUserById(id) {
      queries.push(`SELECT * FROM users WHERE id = ${id}`);
      const user = users.find((candidate) => candidate.id === id);
      return user ? { ...user } : null;
    },
    async findUsersByIds(ids) {
      queries.push(`SELECT * FROM users WHERE id = ANY([${ids.join(', ')}])`);
      return users.filter((user) => ids.includes(user.id)).map((user) => ({ ...user }));
    },
  };
}

type Batch<K, V> = (keys: K[]) => Promise<Array<V | Error>>;

interface Pending<K, V> {
  key: K;
  resolve: (value: V) => void;
  reject: (error: unknown) => void;
}

export class DataLoader<K, V> {
  private readonly cache = new Map<K, Promise<V>>();
  private queue: Pending<K, V>[] = [];

  constructor(private readonly batch: Batch<K, V>) {}

  load(key: K): Promise<V> {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (this.queue.length === 1) {
        queueMicrotask(() => this.dispatch());
      }
    });
    this.cache.set(key, promise);
    promise.catch(() => this.cache.delete(key));
    return promise;
  }

  private async dispatch(): Promise<void> {
    const queue = this.queue;
    this.queue = [];
    const keys = queue.map((item) => item.key);
    try {
      const results = await this.batch(keys);
      if (results.length !== keys.length) {
        throw new Error(`DataLoader batch returned ${results.length} results for ${keys.length} keys`);
      }
      queue.forEach((item, index) => {
        const result = results[index];
        if (result instanceof Error) {
          item.reject(result);
        } else {
          item.resolve(result);
        }
      });
    } catch (error) {
      queue.forEach((item) => item.reject(error));
    }
  }
}

export async function getFeed(db: Database): Promise<Array<Post & { author: User | null }>> {
  const authors = new DataLoader<number, User | null>(async (ids) => {
    const rows = await db.findUsersByIds(ids);
    const byId = new Map(rows.map((user) => [user.id, user]));
    return ids.map((id) => byId.get(id) ?? null);
  });
  const posts = await db.findPosts();
  return Promise.all(posts.map(async (post) => ({ ...post, author: await authors.load(post.authorId) })));
}

async function main() {
  const db = createDatabase();
  const feed = await getFeed(db);
  console.log(feed.map((post) => `${post.title} by ${post.author?.name ?? 'unknown'}`));
  console.log(db.queries);
}

main();
