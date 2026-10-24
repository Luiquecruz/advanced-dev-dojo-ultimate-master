// TODO: make `last` optional
function formatName(first: string, last: string): string {
  return last ? `${first} ${last}` : first;
}

// TODO: use default parameters instead of || fallbacks
function repeatText(text: string, times?: number, separator?: string): string {
  const count = times || 2;
  const glue = separator || ' ';
  return Array.from({ length: count }, () => text).join(glue);
}

// TODO: replace the legacy `arguments` object with a typed rest parameter
function sum(): number {
  let total = 0;
  for (let index = 0; index < arguments.length; index++) {
    total += arguments[index];
  }
  return total;
}
