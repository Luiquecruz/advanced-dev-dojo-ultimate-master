export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be a positive integer');
  }
  const results: R[] = new Array(items.length);
  let next = 0;
  let failed = false;

  async function worker(): Promise<void> {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
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
