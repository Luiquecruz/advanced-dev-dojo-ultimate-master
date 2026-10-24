function formatName(first: string, last?: string): string {
  return last ? `${first} ${last}` : first;
}

function repeatText(text: string, times = 2, separator = ' '): string {
  return Array.from({ length: times }, () => text).join(separator);
}

function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
