function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    return `text(${value.length})`;
  }
  if (typeof value === 'number') {
    return `number(${value * 2})`;
  }
  return 'other';
}
