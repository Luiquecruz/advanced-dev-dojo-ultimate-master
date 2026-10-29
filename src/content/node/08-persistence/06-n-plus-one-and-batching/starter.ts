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

export class DataLoader<K, V> {
  constructor(private readonly batch: Batch<K, V>) {}

  async load(key: K): Promise<V> {
    // TODO: cache one promise per key, queue the key and dispatch every key queued in the same tick in one batch call
    const [result] = await this.batch([key]);
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }
}

export async function getFeed(db: Database): Promise<Array<Post & { author: User | null }>> {
  // TODO: load the authors through a DataLoader backed by db.findUsersByIds
  const posts = await db.findPosts();
  return Promise.all(posts.map(async (post) => ({ ...post, author: await db.findUserById(post.authorId) })));
}

async function main() {
  const db = createDatabase();
  const feed = await getFeed(db);
  console.log(feed.map((post) => `${post.title} by ${post.author?.name ?? 'unknown'}`));
  console.log(db.queries);
}

main();
