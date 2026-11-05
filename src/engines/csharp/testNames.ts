const ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', '0': '\0', a: '\x07', b: '\b', f: '\f', v: '\v', e: '\x1b' };

/**
 * Blanks out `//` and `/* *\/` comments, keeping string and character literals (regular, verbatim, interpolated) intact, so a
 * commented-out `[Test("…")]` is not listed.
 */
function stripComments(source: string): string {
  let output = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        index += 1;
      }
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 2;
      output += ' ';
      continue;
    }
    if (char === '"' || char === "'") {
      const verbatim = source[index - 1] === '@' || (source[index - 1] === '$' && source[index - 2] === '@') || (source[index - 1] === '@' && source[index - 2] === '$');
      let end = index + 1;
      while (end < source.length) {
        if (!verbatim && source[end] === '\\') {
          end += 2;
          continue;
        }
        if (source[end] === char) {
          if (verbatim && source[end + 1] === char) {
            end += 2;
            continue;
          }
          break;
        }
        if (!verbatim && source[end] === '\n') {
          break;
        }
        end += 1;
      }
      output += source.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    output += char;
    index += 1;
  }
  return output;
}

function unescapeRegular(body: string): string {
  return body.replace(/\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|x[0-9a-fA-F]{1,4}|.)/g, (_, escape: string) => {
    if (/^[uUx]/.test(escape) && escape.length > 1) {
      return String.fromCodePoint(Number.parseInt(escape.slice(1), 16));
    }
    return ESCAPES[escape] ?? escape;
  });
}

/**
 * Extracts the names of `[Test("…")]` methods from a C# test file without compiling it, in source order (the order the host runs them).
 * Accepts `Test`, `TestAttribute` and `Dojo.Test`, regular and verbatim string literals, and other attributes in the same brackets.
 */
export function listCsharpTestNames(tests: string): string[] {
  const names: string[] = [];
  const pattern = /(?:\[|,)\s*(?:global::)?(?:Dojo\.)?Test(?:Attribute)?\s*\(\s*(@?)"((?:[^"\\\n]|\\.|"")*)"\s*\)/g;
  for (const match of stripComments(tests).matchAll(pattern)) {
    const [, verbatim, body] = match;
    names.push(verbatim ? body.replace(/""/g, '"') : unescapeRegular(body));
  }
  return names;
}
