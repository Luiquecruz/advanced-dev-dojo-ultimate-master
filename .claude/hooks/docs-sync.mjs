#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const README = 'README.md';
const AGENT_GUIDE = '.claude/CLAUDE.md';
const ARCHITECTURE = '.claude/docs/ARCHITECTURE.md';
const CONTENT_GUIDE = '.claude/docs/CONTENT_GUIDE.md';
const CURRICULUM = '.claude/docs/CURRICULUM.md';
const CONTRIBUTING = '.claude/docs/CONTRIBUTING.md';
const SPECS = '.claude/specs/';
const PYTHON_TRACK = '.claude/docs/python-track/';

const DOC_PATTERN = /^(README\.md|\.claude\/CLAUDE\.md|\.claude\/docs\/.+\.md|\.claude\/specs\/.+\.md)$/;
const IGNORED_PATTERN = /(\.test\.tsx?$|^src\/content\/[^/]+\/\d+-[^/]+\/)/;

/**
 * Code areas and the documents that describe them, first match wins.
 */
const RULES = [
  { pattern: /^src\/content\/[^/]+\/track\.json$/, docs: [README, CURRICULUM, CONTENT_GUIDE] },
  { pattern: /^src\/content\/[^/]+\.ts$/, docs: [ARCHITECTURE, AGENT_GUIDE] },
  { pattern: /^src\/engines\/python\//, docs: [PYTHON_TRACK, CONTENT_GUIDE, ARCHITECTURE] },
  { pattern: /^scripts\/python-track\//, docs: [PYTHON_TRACK, README, AGENT_GUIDE] },
  { pattern: /^src\/engines\/[^/]+\/registry\.ts$/, docs: [CONTENT_GUIDE] },
  { pattern: /^src\/engines\//, docs: [ARCHITECTURE, CONTENT_GUIDE, AGENT_GUIDE] },
  { pattern: /^(src\/sandbox\/|sandbox\.html$)/, docs: [ARCHITECTURE, AGENT_GUIDE] },
  { pattern: /^src\/verify\//, docs: [CONTENT_GUIDE, AGENT_GUIDE] },
  { pattern: /^src\/shared\/(motion|scene|capabilities|design)\//, docs: [AGENT_GUIDE, SPECS] },
  { pattern: /^src\/(app|pages|features|entities|shared)\//, docs: [ARCHITECTURE, AGENT_GUIDE] },
  { pattern: /^src\/[^/]+\.tsx?$/, docs: [ARCHITECTURE, AGENT_GUIDE] },
  { pattern: /^(package\.json|vite\.config\.ts|tsconfig\.json|index\.html|plugins\/|scripts\/)/, docs: [README, AGENT_GUIDE, CONTENT_GUIDE] },
  { pattern: /^\.claude\/(settings\.json|hooks\/)/, docs: [CONTRIBUTING] },
];

/**
 * Runs git in the repository and returns stdout (trimmed unless raw), or null when git fails.
 */
function git(root, args, raw = false) {
  try {
    const output = execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return raw ? output : output.trim();
  } catch {
    return null;
  }
}

/**
 * Reads the hook payload from stdin; empty when run by hand.
 */
function readPayload() {
  if (process.stdin.isTTY) return {};
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Commit the branch is compared against: its upstream, else the merge base with main.
 */
function baseRef(root) {
  const upstream = git(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstream) return upstream;
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch && branch !== 'main') return git(root, ['merge-base', 'main', 'HEAD']);
  return null;
}

/**
 * Files changed in the working tree plus commits not yet on the base.
 */
function changedFiles(root) {
  const files = new Set();
  const status = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], true) ?? '';
  const entries = status.split('\0').filter(Boolean);
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    files.add(entry.slice(3));
    if (entry[0] === 'R' || entry[0] === 'C') index++;
  }
  const base = baseRef(root);
  if (base) {
    const committed = git(root, ['diff', '--name-only', `${base}...HEAD`]) ?? '';
    committed.split('\n').filter(Boolean).forEach((file) => files.add(file));
  }
  return [...files].sort();
}

/**
 * Code files whose documents were not touched in the same change.
 */
function uncoveredFiles(files) {
  const touchedDocs = files.filter((file) => DOC_PATTERN.test(file));
  const isTouched = (doc) => touchedDocs.some((file) => (doc.endsWith('/') ? file.startsWith(doc) : file === doc));
  return files
    .filter((file) => !DOC_PATTERN.test(file) && !IGNORED_PATTERN.test(file))
    .map((file) => ({ file, rule: RULES.find((rule) => rule.pattern.test(file)) }))
    .filter(({ rule }) => rule && !rule.docs.some(isTouched))
    .map(({ file, rule }) => ({ file, docs: rule.docs }));
}

/**
 * Hash of the uncovered files and their contents, so one state is reported once.
 */
function fingerprint(root, uncovered) {
  const hash = createHash('sha256');
  for (const { file } of uncovered) {
    const path = join(root, file);
    hash.update(file);
    hash.update(existsSync(path) ? readFileSync(path) : 'deleted');
  }
  return hash.digest('hex');
}

/**
 * Message listing each uncovered file with the documents to review.
 */
function describe(uncovered) {
  const lines = uncovered.map(({ file, docs }) => `- ${file} → ${docs.join(', ')}`);
  return [
    'Docs sync: these changes touch documented areas and none of their documents changed in this change:',
    ...lines,
    '',
    `Review the listed documents and update the sections that describe what changed (rules in ${CONTRIBUTING}, "Documentation upkeep").`,
    'If the change alters nothing a document describes, state that in one line and finish.',
  ].join('\n');
}

const checkMode = process.argv.includes('--check');
const payload = checkMode ? {} : readPayload();
const root = git(payload.cwd ?? process.cwd(), ['rev-parse', '--show-toplevel']);
if (!root) process.exit(0);

const uncovered = uncoveredFiles(changedFiles(root));

if (checkMode) {
  if (uncovered.length === 0) {
    console.log('Docs sync: every changed area has its documents updated.');
    process.exit(0);
  }
  console.log(describe(uncovered));
  process.exit(1);
}

if (uncovered.length === 0) process.exit(0);

const statePath = resolve(root, git(root, ['rev-parse', '--git-path', 'dev-dojo-docs-sync']));
const current = fingerprint(root, uncovered);
const previous = existsSync(statePath) ? readFileSync(statePath, 'utf8') : '';
writeFileSync(statePath, current);

if (payload.stop_hook_active || previous === current) process.exit(0);

console.log(JSON.stringify({ decision: 'block', reason: describe(uncovered) }));
