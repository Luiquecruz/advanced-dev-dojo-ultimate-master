/**
 * Extracts test names from test source without running it.
 */
export function listTestNames(tests: string): string[] {
  const names: string[] = [];
  const pattern = /\b(?:test|it)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tests))) {
    names.push(match[2].replace(/\\(['"`])/g, '$1'));
  }
  return names;
}
