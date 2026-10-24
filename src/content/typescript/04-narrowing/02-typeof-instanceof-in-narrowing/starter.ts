type Circle = { radius: number };
type Square = { side: number };

function toTimestamp(value: string | number | Date): number {
  // TODO: replace the assertion with typeof / instanceof checks
  return (value as Date).getTime();
}

function describeError(error: unknown): string {
  // TODO: narrow unknown with instanceof Error and typeof
  return (error as Error).message;
}

function area(shape: Circle | Square): number {
  // TODO: use the in operator to tell circles from squares
  const circle = shape as Circle;
  return Math.PI * circle.radius ** 2;
}
