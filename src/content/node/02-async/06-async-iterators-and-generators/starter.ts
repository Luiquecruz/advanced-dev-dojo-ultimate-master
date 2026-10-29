export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type FetchPage<T> = (cursor: string | null) => Promise<Page<T>>;

export async function* paginate<T>(fetchPage: FetchPage<T>): AsyncGenerator<T> {
  // TODO: fetch the first page with cursor null, yield its items one by one, and follow nextCursor until it is null
}

export async function take<T>(source: AsyncIterable<T>, count: number): Promise<T[]> {
  // TODO: collect at most `count` items with for await, then break so the source stops
  return [];
}

export async function* chunk<T>(source: AsyncIterable<T>, size: number): AsyncGenerator<T[]> {
  // TODO: yield arrays of `size` items, and a last shorter array for the rest
}

const pages: Record<string, Page<number>> = {
  start: { items: [1, 2, 3], nextCursor: 'b' },
  b: { items: [4, 5, 6], nextCursor: 'c' },
  c: { items: [7], nextCursor: null },
};

async function main() {
  const fetchPage: FetchPage<number> = async (cursor) => {
    console.log(`fetching page ${cursor ?? 'start'}`);
    return pages[cursor ?? 'start'];
  };
  console.log(await take(paginate(fetchPage), 4));
  for await (const group of chunk(paginate(fetchPage), 2)) {
    console.log(group);
  }
}

main();
