interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

type FetchPage<T> = (cursor: string | null) => Promise<Page<T>>;

async function* paginate<T>(fetchPage: FetchPage<T>): AsyncGenerator<T, void, undefined> {
  let cursor: string | null = null;
  do {
    const page: Page<T> = await fetchPage(cursor);
    yield* page.items;
    cursor = page.nextCursor;
  } while (cursor !== null);
}

async function take<T>(source: AsyncIterable<T>, count: number): Promise<T[]> {
  const values: T[] = [];
  if (count <= 0) {
    return values;
  }
  for await (const value of source) {
    values.push(value);
    if (values.length >= count) {
      break;
    }
  }
  return values;
}

async function* mapAsync<T, U>(source: AsyncIterable<T>, transform: (value: T) => U | Promise<U>): AsyncGenerator<U, void, undefined> {
  for await (const value of source) {
    yield await transform(value);
  }
}
