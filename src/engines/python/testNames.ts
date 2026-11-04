/**
 * Extracts the names of `@test("...")` decorated functions from a Python test file without running it.
 */
export function listPythonTestNames(tests: string): string[] {
  const names: string[] = [];
  const pattern = /^[ \t]*@test\(\s*[rR]?(['"])((?:\\.|(?!\1).)*)\1\s*\)/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tests))) {
    names.push(match[2].replace(/\\(['"\\])/g, '$1'));
  }
  return names;
}
