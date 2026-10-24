import type { ChallengeTest } from './types';

const HEADING = /^##\s+(type|runtime|pattern|forbid)\s*:\s*(.+?)\s*$/;
const FENCE = /^```(\w*)\s*$/;

/**
 * Parses a tests.md file: each `## <kind>: <name>` heading followed by one fenced block.
 * Kinds: `type` (TS snippet), `runtime` (JS using assert), `pattern` (regex that must match), `forbid` (regex that must not match).
 * Pattern blocks may end with a `flags: <flags>` line.
 */
export function parseTypeScriptTests(markdown: string): ChallengeTest[] {
  const tests: ChallengeTest[] = [];
  const lines = markdown.split('\n');
  let index = 0;
  while (index < lines.length) {
    const heading = HEADING.exec(lines[index]);
    index++;
    if (!heading) {
      continue;
    }
    while (index < lines.length && !FENCE.test(lines[index])) {
      index++;
    }
    index++;
    const body: string[] = [];
    while (index < lines.length && !/^```\s*$/.test(lines[index])) {
      body.push(lines[index]);
      index++;
    }
    index++;
    const [, kind, name] = heading;
    if (kind === 'type' || kind === 'runtime') {
      tests.push({ kind, name, code: body.join('\n') });
      continue;
    }
    const flagsLine = body.length > 1 && /^flags:\s*\w*$/.test(body[body.length - 1].trim()) ? body.pop()! : undefined;
    tests.push({
      kind: 'pattern',
      name,
      pattern: body.join('\n').trim(),
      flags: flagsLine?.split(':')[1].trim() || undefined,
      mustMatch: kind === 'pattern',
    });
  }
  return tests;
}

/**
 * Serializes structured tests back into the tests.md format.
 */
export function serializeTypeScriptTests(tests: ChallengeTest[]): string {
  return tests
    .map((test) => {
      if (test.kind === 'pattern') {
        const flags = test.flags ? `\nflags: ${test.flags}` : '';
        return `## ${test.mustMatch ? 'pattern' : 'forbid'}: ${test.name}\n\n\`\`\`regex\n${test.pattern}${flags}\n\`\`\``;
      }
      return `## ${test.kind}: ${test.name}\n\n\`\`\`${test.kind === 'type' ? 'ts' : 'js'}\n${test.code}\n\`\`\``;
    })
    .join('\n\n')
    .concat('\n');
}
