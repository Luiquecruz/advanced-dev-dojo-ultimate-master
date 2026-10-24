interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

type FetchPage<T> = (cursor: string | null) => Promise<Page<T>>;

async function* paginate<T>(fetchPage: FetchPage<T>): AsyncGenerator<T, void, undefined> {
  // TODO: yield each page's items before requesting the next page
  const everything: T[] = [];
  let cursor: string | null = null;
  do {
    const page: Page<T> = await fetchPage(cursor);
    everything.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  yield* everything;
}

async function take<T>(source: AsyncIterable<T>, count: number): Promise<T[]> {
  // TODO: collect at most `count` values with for await and break early
  return [];
}

async function* mapAsync<T, U>(source: AsyncIterable<T>, transform: (value: T) => U | Promise<U>): AsyncGenerator<U, void, undefined> {
  // TODO: yield every value of source after awaiting transform(value)
}
