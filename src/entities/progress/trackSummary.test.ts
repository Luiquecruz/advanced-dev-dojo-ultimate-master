import { describe, expect, it } from 'vitest';
import type { Lesson, Module, Track } from '@/content';
import type { ProgressState } from './progressStore';
import { modulesAroundStage, summarizeTrack } from './trackSummary';

function lesson(id: string, moduleId: string): Lesson {
  return { key: `demo/${id}`, id, trackId: 'demo', moduleId, title: id, summary: '', level: 'beginner', tags: [], theory: '', concepts: [], quiz: [], resources: [], challenge: {} as Lesson['challenge'] };
}

function buildTrack(moduleCount: number, lessonsPerModule: number): Track {
  const modules: Module[] = Array.from({ length: moduleCount }, (_, moduleIndex) => {
    const id = `module-${moduleIndex + 1}`;
    return { id, trackId: 'demo', title: id, description: '', lessons: Array.from({ length: lessonsPerModule }, (__, lessonIndex) => lesson(`${id}-lesson-${lessonIndex + 1}`, id)) };
  });
  return { id: 'demo', engine: 'typescript', order: 1, title: 'Demo', description: '', version: '1', modules, lessons: modules.flatMap((module) => module.lessons) };
}

function progressWith(completed: string[], lastLesson?: string): ProgressState {
  return {
    challenges: Object.fromEntries(completed.map((id) => [`demo/${id}`, true as const])),
    quizzes: {},
    visited: {},
    code: {},
    quizAnswers: {},
    lastLesson: lastLesson ? { demo: lastLesson } : {},
  };
}

describe('summarizeTrack', () => {
  const track = buildTrack(6, 2);

  it('starts a fresh track at its first lesson', () => {
    const summary = summarizeTrack(track, progressWith([]));
    expect(summary).toMatchObject({ status: 'not-started', done: 0, percent: 0, currentModuleIndex: 0 });
    expect(summary.resumeLesson.id).toBe('module-1-lesson-1');
  });

  it('resumes the last visited lesson and marks its module as the current stage', () => {
    const summary = summarizeTrack(track, progressWith(['module-1-lesson-1', 'module-1-lesson-2'], 'module-3-lesson-1'));
    expect(summary).toMatchObject({ status: 'in-progress', done: 2, percent: 17, currentModuleIndex: 2 });
    expect(summary.modules.map((module) => module.state)).toEqual(['done', 'upcoming', 'current', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('reports a completed track', () => {
    const summary = summarizeTrack(track, progressWith(track.lessons.map((entry) => entry.id)));
    expect(summary).toMatchObject({ status: 'completed', percent: 100 });
  });
});

describe('modulesAroundStage', () => {
  const track = buildTrack(8, 1);

  it('keeps one module before the current stage', () => {
    const summary = summarizeTrack(track, progressWith([], 'module-4-lesson-1'));
    expect(modulesAroundStage(summary, 4).map((entry) => entry.index)).toEqual([2, 3, 4, 5]);
  });

  it('stays inside the track at the edges', () => {
    const summary = summarizeTrack(track, progressWith([], 'module-8-lesson-1'));
    expect(modulesAroundStage(summary, 4).map((entry) => entry.index)).toEqual([4, 5, 6, 7]);
  });
});
