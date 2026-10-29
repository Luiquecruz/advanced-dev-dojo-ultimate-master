export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  // TODO: validate limit, then run at most `limit` workers that pull the next index until the list is done or a task failed
  return Promise.all(items.map((item, index) => fn(item, index)));
}

async function main() {
  const delays = [30, 10, 20, 5, 15];
  const results = await mapWithConcurrency(delays, 2, async (delay, index) => {
    console.log(`start #${index}`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    console.log(`done #${index} after ${delay} ms`);
    return delay * 2;
  });
  console.log(results);
}

main();
