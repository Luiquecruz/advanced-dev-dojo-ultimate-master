type Id = string | number;

function formatId(id: Id): string {
  if (typeof id === 'number') {
    return String(id).padStart(6, '0');
  }
  return id.trim().toUpperCase();
}

function normalizeTags(input: string | string[]): string[] {
  const tags = typeof input === 'string' ? input.split(',') : input;
  return tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

function totalQuantity(values: (number | string)[]): number {
  return values.reduce<number>((total, value) => total + (typeof value === 'number' ? value : Number(value)), 0);
}
