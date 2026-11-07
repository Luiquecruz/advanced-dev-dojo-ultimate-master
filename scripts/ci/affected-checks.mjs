#!/usr/bin/env node
// Usage: node scripts/ci/affected-checks.mjs --base <ref>   checks for the files changed since the merge base with <ref>
//        node scripts/ci/affected-checks.mjs --all          every check (pushes to main, schedules, manual runs)
// Writes one `name=value` line per output to $GITHUB_OUTPUT when it is set, and prints the result as JSON.

import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const STRUCTURE_SUITE = 'structure';

export const CODEQL_LANGUAGES = ['javascript-typescript', 'python', 'actions'];

const FULL_RUN_PATTERNS = [
  /^package(-lock)?\.json$/,
  /^vite\.config\.ts$/,
  /^tsconfig\.json$/,
  /^\.nvmrc$/,
  /^\.github\/workflows\/ci\.yml$/,
  /^scripts\//,
  /^plugins\//,
  /^vendor\//,
  /^sandbox\.html$/,
  /^src\/sandbox\//,
  /^src\/engines\/shared\//,
  /^src\/engines\/[^/]+$/,
  /^src\/content\/[^/]+$/,
];

const STRUCTURE_PATTERNS = [
  /^src\/content\//,
  /^src\/engines\//,
  /^\.claude\/docs\/CURRICULUM\.md$/,
  /^src\/shared\/design\/tokens\.css$/,
  /^src\/entities\/track\//,
];

const PYTHON_PATTERNS = [/\.py$/, /^tests\/python\//, /^pyproject\.toml$/, /^src\/engines\/python\//];

const DOCUMENTATION_PATTERNS = [/^(?!src\/).*\.md$/, /^\.claude\/(?!hooks\/)/, /^\.coderabbit\.yaml$/, /^\.github\/CODEOWNERS$/, /^\.gitleaksignore$/];

const WORKFLOW_PATTERNS = [/^\.github\/workflows\//];

const DEPENDENCY_PATTERNS = [/^package(-lock)?\.json$/, /^tests\/python\/requirements\.txt$/, /^pyproject\.toml$/];

const LESSON_FOLDER = /^src\/content\/[^/]+\//;

const SCRIPT_FILE = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

/**
 * Tracks with the engines that grade them: `engine` for a single-language track, the language ids of `languages` (each
 * language is graded by the engine of the same id) for a multi-language track.
 *
 * @param {string} root
 * @returns {{ id: string, engines: string[] }[]}
 */
export function readTracks(root) {
  const contentDirectory = resolve(root, 'src/content');
  return readdirSync(contentDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const track = JSON.parse(readFileSync(resolve(contentDirectory, entry.name, 'track.json'), 'utf8'));
      return { id: entry.name, engines: track.languages ?? [track.engine] };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * CI jobs needed by a set of changed files.
 *
 * @param {{ changedFiles: string[], tracks: { id: string, engines: string[] }[], fullRun: boolean }} input
 * @returns {{ suites: string[], python: boolean, code: boolean, workflows: boolean, dependencies: boolean, codeql: string[] }}
 */
export function affectedChecks({ changedFiles, tracks, fullRun }) {
  const matches = (patterns) => changedFiles.some((file) => patterns.some((pattern) => pattern.test(file)));
  const trackIds = tracks.map((track) => track.id);
  const verifyHelperChanged = changedFiles.some((file) => file.startsWith('src/verify/') && !trackIds.some((id) => file === `src/verify/${id}.test.ts`));
  const runEverything = fullRun || matches(FULL_RUN_PATTERNS) || verifyHelperChanged;

  const touchedTracks = runEverything
    ? trackIds
    : tracks
        .filter((track) =>
          changedFiles.some(
            (file) =>
              file.startsWith(`src/content/${track.id}/`) ||
              file === `src/verify/${track.id}.test.ts` ||
              track.engines.some((engine) => file.startsWith(`src/engines/${engine}/`)),
          ),
        )
        .map((track) => track.id);
  const structure = runEverything || matches(STRUCTURE_PATTERNS);

  const workflows = fullRun || matches(WORKFLOW_PATTERNS);
  const pythonSources = changedFiles.some((file) => file.endsWith('.py') && !LESSON_FOLDER.test(file));
  const scriptSources = changedFiles.some((file) => SCRIPT_FILE.test(file) && !LESSON_FOLDER.test(file));

  return {
    suites: [...(structure ? [STRUCTURE_SUITE] : []), ...touchedTracks],
    python: runEverything || matches(PYTHON_PATTERNS),
    code: fullRun || changedFiles.some((file) => !DOCUMENTATION_PATTERNS.some((pattern) => pattern.test(file))),
    workflows,
    dependencies: fullRun || matches(DEPENDENCY_PATTERNS),
    codeql: fullRun
      ? CODEQL_LANGUAGES
      : CODEQL_LANGUAGES.filter(
          (language) =>
            (language === 'javascript-typescript' && scriptSources) || (language === 'python' && pythonSources) || (language === 'actions' && workflows),
        ),
  };
}

/**
 * Files changed between the merge base with `base` and HEAD; renames are listed as a deletion plus an addition, so both
 * locations count.
 *
 * @param {string} base
 * @returns {string[]}
 */
function changedFilesSince(base) {
  return execFileSync('git', ['diff', '--name-only', '--no-renames', `${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: options } = parseArgs({ options: { base: { type: 'string' }, all: { type: 'boolean' } } });
  if (!options.all && !options.base) {
    console.error('usage: affected-checks.mjs --base <ref> | --all');
    process.exit(2);
  }
  const changedFiles = options.all ? [] : changedFilesSince(options.base);
  const result = affectedChecks({ changedFiles, tracks: readTracks(ROOT), fullRun: Boolean(options.all) });
  console.log(JSON.stringify({ changedFiles: changedFiles.length, ...result }, null, 2));
  if (process.env.GITHUB_OUTPUT) {
    const lines = Object.entries(result).map(([name, value]) => `${name}=${Array.isArray(value) ? JSON.stringify(value) : String(value)}`);
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  }
}
