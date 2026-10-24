type Id = string | number;

function formatId(id: Id): string {
  // TODO: pad numbers to 6 digits, trim and uppercase strings
  return String(id);
}

function normalizeTags(input: string | string[]): string[] {
  // TODO: turn the input into an array of trimmed, non-empty tags
  return [];
}

function totalQuantity(values: (number | string)[]): number {
  // TODO: sum the values, converting strings with Number
  return 0;
}
