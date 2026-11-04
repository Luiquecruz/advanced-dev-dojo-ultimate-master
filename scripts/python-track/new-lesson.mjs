#!/usr/bin/env node
// Scaffolds a Python track lesson with TODO placeholders. See .claude/docs/python-track/11-working-agreement.md.
// Usage: node scripts/python-track/new-lesson.mjs <NN-module> <NN-lesson-id> [--kind practice|quiz|adr] [--level beginner|intermediate|advanced|expert]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TRACK = join(ROOT, 'src/content/python');
const PLAN = join(ROOT, '.claude/docs/python-track/03-curriculum.md');
const KINDS = ['practice', 'quiz', 'adr'];
const LEVELS = { B: 'beginner', I: 'intermediate', Ad: 'advanced', E: 'expert' };
const FOLDER = /^\d\d-[a-z0-9]+(-[a-z0-9]+)*$/;

function fail(message) {
  console.error(`new-lesson: ${message}`);
  console.error('usage: npm run python:new -- <NN-module> <NN-lesson-id> [--kind practice|quiz|adr] [--level beginner|intermediate|advanced|expert]');
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith('--')) {
      const [key, inline] = argument.slice(2).split('=');
      options[key] = inline ?? argv[++index];
      continue;
    }
    positional.push(argument);
  }
  return { positional, options };
}

function plannedLesson(moduleFolder, lessonFolder) {
  if (!existsSync(PLAN)) {
    return undefined;
  }
  let inModule = false;
  for (const line of readFileSync(PLAN, 'utf8').split('\n')) {
    const heading = /^## (\d\d-[a-z0-9-]+)/.exec(line);
    if (heading) {
      inModule = heading[1] === moduleFolder;
      continue;
    }
    const row = /^\|\s*(\d\d-[a-z0-9-]+)\s*\|\s*([A-Z])\s*\|\s*([A-Za-z]+)\s*\|/.exec(line);
    if (inModule && row && row[1] === lessonFolder) {
      return { kind: row[2], level: LEVELS[row[3]] };
    }
  }
  return undefined;
}

function inferKind(lessonId, planned) {
  if (planned?.kind === 'Q' || lessonId.endsWith('-map')) {
    return 'quiz';
  }
  if (planned?.kind === 'A' || lessonId.endsWith('-adr')) {
    return 'adr';
  }
  return 'practice';
}

const theoryPractice = (title) => `# TODO: ${title}

TODO: the model. What Python does, in two or three sentences, then a runnable example.

\`\`\`py
# TODO: runnable example
\`\`\`

## Coming from TypeScript and JavaScript

TODO: the exact JS/TS habit that breaks here. Name the mistake and show both sides.

\`\`\`ts
// TODO: the JavaScript habit
\`\`\`

\`\`\`py
# TODO: the Python equivalent
\`\`\`

## How it works

TODO: the mechanism (data model hook, protocol, bytecode behavior) and its pitfalls.

> **Status as of November 2026:** TODO: volatile facts only (versions, PEP status), each verified against docs.python.org or the PEP. Delete this line if the lesson has none.

## When to choose it

TODO: when to use it, when to avoid it, and the alternative. This section is always last.
`;

const theoryMap = (title) => `# TODO: ${title}

TODO: what this module answers (250-500 words in total).

## Prerequisites

TODO: the earlier modules and ideas this one assumes.

## Coming from TypeScript and JavaScript

TODO: the habits from JS/TS that this module corrects.

## The path

TODO: one line per lesson of the module, in order.

## When to choose it

TODO: the decision the module ends with (its ADR checkpoint).
`;

const theoryAdr = () => `# TODO: Checkpoint title

TODO: why this decision matters at the end of the module, and what the briefing in the Challenge tab asks for.

## What a good ADR records

TODO: context, decision ("We will ..."), at least two rejected alternatives with reasons, positive and negative consequences.

## Reading the briefing

TODO: which numbers and constraints of the briefing the PLAN must be coherent with.
`;

const quizJson = (count) =>
  `${JSON.stringify(
    Array.from({ length: count }, (_, index) => ({
      question: `TODO: question ${index + 1} (a decision or a prediction, never PEP-number trivia)`,
      options: ['TODO: option A', 'TODO: option B', 'TODO: option C', 'TODO: option D'],
      answer: index % 4,
      explanation: 'TODO: name the mechanism that makes the answer right.',
    })),
    null,
    2,
  )}\n`;

const conceptsJson = `${JSON.stringify(
  [
    { term: 'TODO: term', description: 'TODO: one-sentence definition.' },
    { term: 'TODO: term', description: 'TODO: one-sentence definition.' },
  ],
  null,
  2,
)}\n`;

const challengePractice = `# TODO: challenge title

TODO: one paragraph of realistic context (a module to build or repair, never a puzzle).

Implement in \`main.py\`:

- \`TODO_function(argument)\`: TODO: what it returns, mutates or raises (name every exception the tests rely on).

The tests are the contract: name every function, class, parameter and exception they use.
`;

const challengeAdr = `# TODO: briefing title

TODO: the briefing with concrete numbers and constraints (volumes, budgets, failure that happened).

Fill \`ADR\` and \`PLAN\` in \`adr.py\`:

- \`ADR\`: \`id\`, \`title\`, \`status: "accepted"\`, \`context\`, \`decision\` starting with "We will", at least two \`alternatives\` (\`option\` + \`reason\`), \`consequences\` with \`positive\` and \`negative\`.
- \`PLAN\`: TODO: every field and the values the briefing allows.
`;

const hints = `TODO: first hint, a nudge towards the mechanism.
---
TODO: second hint, names the tool or protocol to use.
---
TODO: third hint (optional), close to the answer without giving the code.
`;

const approach = `1. TODO: read the contract in challenge.md and list what each test checks.
2. TODO: the first decision the learner makes and why.
3. TODO: the mechanism to apply.
4. TODO: the edge case that breaks the naive version.
5. TODO: how to confirm with the Run demo.
`;

const mainStarter = `# TODO: implement every function named in challenge.md


def todo_function(value):
    # TODO: replace with the real implementation
    raise NotImplementedError
`;

const mainSolution = `# TODO: write the solution; no TODO text may remain here


def todo_function(value):
    raise NotImplementedError
`;

const demo = `from main import todo_function

# TODO: a realistic scenario that prints at least one line and exits 0
print("TODO:", todo_function)
`;

const adrPy = `ADR = {
    "id": 0,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing
    "context": "",
    # TODO: one sentence starting with "We will"
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...}
    "alternatives": [],
    # TODO: what the team gains and what it pays
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: module-specific plan fields, coherent with the briefing
}
`;

const testsPractice = `@test("TODO: first behavior, written as a sentence")
def _():
    result = mod.todo_function(1)
    assert result == 1


@test("TODO: second behavior")
async def _():
    error = await capture_error(lambda: mod.todo_function(None))
    assert type(error).__name__ == "ValueError"


@test("TODO: third behavior")
def _():
    assert False
`;

const testsAdr = `@test("TODO: the ADR is accepted and its decision starts with We will")
def _():
    status = mod.ADR["status"]
    assert status == "accepted"


@test("TODO: the ADR lists two distinct rejected alternatives")
def _():
    options = {alternative["option"] for alternative in mod.ADR["alternatives"]}
    assert len(options) >= 2


@test("TODO: the PLAN is coherent with the briefing")
def _():
    assert False
`;

const meta = (title, level, kind, run) =>
  `${JSON.stringify(
    {
      title: `TODO: ${title}`,
      summary: 'TODO: one or two sentences: what the learner understands and what they build.',
      level,
      tags: ['established', 'core', kind === 'quiz' ? 'theory' : 'practice'],
      ...(kind === 'quiz' ? {} : { entry: kind === 'adr' ? 'adr.py' : 'main.py' }),
      ...(run ? { run: 'demo.py' } : {}),
      resources:
        kind === 'adr'
          ? [
              { label: 'Michael Nygard: Documenting Architecture Decisions', url: 'https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions' },
              { label: 'MADR: Markdown Architectural Decision Records', url: 'https://adr.github.io/madr/' },
            ]
          : [{ label: 'TODO: primary source', url: 'https://docs.python.org/3/' }],
    },
    null,
    2,
  )}\n`;

function filesFor(kind, title, level) {
  if (kind === 'quiz') {
    return {
      'theory.md': theoryMap(title),
      'concepts.json': conceptsJson,
      'quiz.json': quizJson(4),
      'meta.json.draft': meta(title, level, kind, false),
    };
  }
  const common = {
    'concepts.json': conceptsJson,
    'hints.md': hints,
    'approach.md': approach,
    'quiz.json': quizJson(4),
  };
  if (kind === 'adr') {
    return {
      'theory.md': theoryAdr(),
      'challenge.md': challengeAdr,
      ...common,
      'starter/adr.py': adrPy,
      'solution/adr.py': adrPy,
      'tests.py': testsAdr,
      'meta.json.draft': meta(title, level, kind, false),
    };
  }
  return {
    'theory.md': theoryPractice(title),
    'challenge.md': challengePractice,
    ...common,
    'starter/main.py': mainStarter,
    'starter/demo.py': demo,
    'solution/main.py': mainSolution,
    'solution/demo.py': demo,
    'tests.py': testsPractice,
    'meta.json.draft': meta(title, level, kind, true),
  };
}

const { positional, options } = parseArgs(process.argv.slice(2));
if (positional.length !== 2) {
  fail('expected a module folder and a lesson folder');
}
const moduleFolder = basename(positional[0]);
const lessonFolder = basename(positional[1]);
if (!FOLDER.test(moduleFolder) || !FOLDER.test(lessonFolder)) {
  fail('folders must look like NN-kebab-case (for example 03-functions 02-args-and-kwargs)');
}
const lessonId = lessonFolder.replace(/^\d\d-/, '');
const planned = plannedLesson(moduleFolder, lessonFolder);
if (!planned) {
  console.warn(`new-lesson: ${moduleFolder}/${lessonFolder} is not in 03-curriculum.md; add it to the plan before writing.`);
}
const kind = options.kind ?? inferKind(lessonId, planned);
if (!KINDS.includes(kind)) {
  fail(`unknown --kind "${kind}"`);
}
const level = options.level ?? planned?.level ?? 'intermediate';
if (!Object.values(LEVELS).includes(level)) {
  fail(`unknown --level "${level}"`);
}

const moduleDirectory = join(TRACK, moduleFolder);
const lessonDirectory = join(moduleDirectory, lessonFolder);
if (existsSync(lessonDirectory)) {
  fail(`${relative(ROOT, lessonDirectory)} already exists; nothing was written`);
}

const created = [];
if (!existsSync(join(moduleDirectory, 'module.json'))) {
  mkdirSync(moduleDirectory, { recursive: true });
  writeFileSync(join(moduleDirectory, 'module.json'), `${JSON.stringify({ title: 'TODO: module title', description: 'TODO: one sentence from 03-curriculum.md.' }, null, 2)}\n`);
  created.push(relative(ROOT, join(moduleDirectory, 'module.json')));
}
const title = lessonId.replace(/-/g, ' ');
for (const [name, content] of Object.entries(filesFor(kind, title, level))) {
  const path = join(lessonDirectory, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  created.push(relative(ROOT, path));
}

const relativeLesson = relative(ROOT, lessonDirectory);
console.log(`Scaffolded a ${kind} lesson (${level}) in ${relativeLesson}:`);
created.forEach((path) => console.log(`  ${path}`));
console.log(`
Next steps:
  1. Replace every TODO (grep -rn TODO ${relativeLesson}).
  2. Rename meta.json.draft to meta.json only when every file is done: the loader ignores the lesson until then.
  3. LESSON=python/${lessonId} npx vitest run src/verify/python.test.ts src/verify/pythonConventions.test.ts
  4. npm run python:curriculum, then npx vitest run src/verify/curriculum.test.ts`);
