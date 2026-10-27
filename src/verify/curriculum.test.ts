// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allLessons, tracks } from '../content';

const CURRICULUM = readFileSync(resolve(import.meta.dirname, '../../.claude/docs/CURRICULUM.md'), 'utf8');
const SECTION = /^## .*\(`src\/content\/([a-z0-9-]+)`/;
const MODULE = /^### (\d\d-[a-z0-9-]+)/;
const LESSON = /^(\d\d-[a-z0-9-]+)/;

interface PlannedLesson {
  path: string;
  written: boolean;
}

function plannedLessons(): PlannedLesson[] {
  const planned: PlannedLesson[] = [];
  let track: string | undefined;
  let module: string | undefined;
  for (const line of CURRICULUM.split('\n')) {
    const section = SECTION.exec(line);
    if (section) {
      [track, module] = [section[1], undefined];
      continue;
    }
    const heading = MODULE.exec(line);
    if (heading) {
      module = heading[1];
      continue;
    }
    if (!track || !module || !LESSON.test(line.trim())) {
      continue;
    }
    for (const item of line.split(' · ')) {
      const lesson = LESSON.exec(item.trim());
      if (lesson) {
        planned.push({ path: `${track}/${module}/${lesson[1]}`, written: item.includes('✓') });
      }
    }
  }
  return planned;
}

const planned = plannedLessons();
const written = new Set(allLessons.map((lesson) => lesson.folder));

describe('curriculum plan', () => {
  it('has a section for every track', () => {
    const sections = new Set(planned.map((lesson) => lesson.path.split('/')[0]));
    expect(tracks.map((track) => track.id).filter((id) => !sections.has(id))).toEqual([]);
  });

  it('lists every written lesson with a ✓', () => {
    const marked = new Set(planned.filter((lesson) => lesson.written).map((lesson) => lesson.path));
    expect([...written].filter((path) => !marked.has(path)).sort()).toEqual([]);
  });

  it('marks ✓ only lessons that exist', () => {
    expect(planned.filter((lesson) => lesson.written && !written.has(lesson.path)).map((lesson) => lesson.path)).toEqual([]);
  });
});
