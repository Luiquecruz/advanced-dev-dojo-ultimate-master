export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type FetchPage<T> = (cursor: string | null) => Promise<Page<T>>;

export async function* paginate<T>(fetchPage: FetchPage<T>): AsyncGenerator<T> {
  let cursor: string | null = null;
  do {
    const page: Page<T> = await fetchPage(cursor);
    yield* page.items;
    cursor = page.nextCursor;
  } while (cursor !== null);
}

export async function take<T>(source: AsyncIterable<T>, count: number): Promise<T[]> {
  const result: T[] = [];
  if (count <= 0) {
    return result;
  }
  for await (const item of source) {
    result.push(item);
    if (result.length >= count) {
      break;
    }
  }
  return result;
}

export async function* chunk<T>(source: AsyncIterable<T>, size: number): AsyncGenerator<T[]> {
  let group: T[] = [];
  for await (const item of source) {
    group.push(item);
    if (group.length === size) {
      yield group;
      group = [];
    }
  }
  if (group.length > 0) {
    yield group;
  }
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
