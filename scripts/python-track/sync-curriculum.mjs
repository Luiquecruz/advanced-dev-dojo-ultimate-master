#!/usr/bin/env node
// Regenerates the module lists of the "## Python" section of .claude/docs/CURRICULUM.md from
// .claude/docs/python-track/03-curriculum.md (the plan) and src/content/python (a lesson is written once it has meta.json).
// Usage: node scripts/python-track/sync-curriculum.mjs [--check]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CURRICULUM = join(ROOT, '.claude/docs/CURRICULUM.md');
const PLAN = join(ROOT, '.claude/docs/python-track/03-curriculum.md');
const TRACK = join(ROOT, 'src/content/python');
const SECTION = '## Python (`src/content/python`)';
const check = process.argv.includes('--check');

function readPlan() {
  const modules = [];
  for (const line of readFileSync(PLAN, 'utf8').split('\n')) {
    const heading = /^## (\d\d-[a-z0-9-]+) — (.+?)(?: \([^)]*\))?\s*$/.exec(line);
    if (heading) {
      modules.push({ folder: heading[1], title: heading[2], lessons: [] });
      continue;
    }
    const row = /^\|\s*(\d\d-[a-z0-9-]+)\s*\|\s*([A-Z])\s*\|/.exec(line);
    if (row && modules.length > 0) {
      modules.at(-1).lessons.push({ folder: row[1], kind: row[2] });
    }
  }
  return modules;
}

function writtenLessons(moduleFolder) {
  const directory = join(TRACK, moduleFolder);
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((name) => /^\d\d-/.test(name) && existsSync(join(directory, name, 'meta.json')))
    .sort();
}

function moduleTitle(module) {
  const path = join(TRACK, module.folder, 'module.json');
  if (!existsSync(path)) {
    return module.title;
  }
  const { title, optional } = JSON.parse(readFileSync(path, 'utf8'));
  const name = typeof title === 'string' && title.trim() && !title.includes('TODO') ? title.trim() : module.title;
  return optional === true ? `${name} (optional)` : name;
}

function renderModules(plan) {
  const warnings = [];
  const blocks = [];
  const plannedModules = new Set(plan.map((module) => module.folder));
  const extraModules = existsSync(TRACK)
    ? readdirSync(TRACK).filter((name) => /^\d\d-/.test(name) && !plannedModules.has(name))
    : [];
  extraModules.forEach((folder) => {
    warnings.push(`module ${folder} exists on disk but not in 03-curriculum.md`);
    plan.push({ folder, title: folder.replace(/^\d\d-/, ''), lessons: [] });
  });
  for (const module of plan.sort((a, b) => a.folder.localeCompare(b.folder))) {
    const written = new Set(writtenLessons(module.folder));
    const planned = new Set(module.lessons.map((lesson) => lesson.folder));
    const lessons = [...module.lessons];
    for (const folder of written) {
      if (!planned.has(folder)) {
        warnings.push(`lesson ${module.folder}/${folder} is written but not in 03-curriculum.md`);
        lessons.push({ folder, kind: 'P' });
      }
    }
    const items = lessons
      .sort((a, b) => a.folder.localeCompare(b.folder))
      .map((lesson) => `${lesson.folder}${lesson.kind === 'Q' ? ' **(quiz)**' : ''}${written.has(lesson.folder) ? ' ✓' : ''}`);
    blocks.push(`### ${module.folder} — ${moduleTitle(module)}\n${items.join(' · ')}`);
  }
  return { body: blocks.join('\n\n'), warnings };
}

const curriculum = readFileSync(CURRICULUM, 'utf8');
const start = curriculum.indexOf(SECTION);
if (start === -1) {
  console.error(`sync-curriculum: "${SECTION}" not found in CURRICULUM.md`);
  process.exit(1);
}
const nextSection = curriculum.indexOf('\n## ', start + SECTION.length);
const end = nextSection === -1 ? curriculum.length : nextSection + 1;
const section = curriculum.slice(start, end);
const firstModule = section.indexOf('\n### ');
const intro = (firstModule === -1 ? section : section.slice(0, firstModule)).trimEnd();

const { body, warnings } = renderModules(readPlan());
const trailing = nextSection === -1 ? '\n' : '\n\n';
const next = `${curriculum.slice(0, start)}${intro}\n\n${body}${trailing}${curriculum.slice(end)}`;
warnings.forEach((warning) => console.warn(`sync-curriculum: ${warning}`));

if (next === curriculum) {
  console.log('CURRICULUM.md Python section is up to date.');
  process.exit(0);
}
if (check) {
  console.error('CURRICULUM.md Python section is out of date: run npm run python:curriculum');
  process.exit(1);
}
writeFileSync(CURRICULUM, next);
console.log('CURRICULUM.md Python section regenerated.');
