type Circle = { radius: number };
type Square = { side: number };

function toTimestamp(value: string | number | Date): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return value;
  }
  return Date.parse(value);
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

function area(shape: Circle | Square): number {
  if ('radius' in shape) {
    return Math.PI * shape.radius ** 2;
  }
  return shape.side ** 2;
}
