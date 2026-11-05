import { describe, expect, it } from 'vitest';
import type { LessonEntry, Module, Track } from '@/content';
import type { ProgressState } from './progressStore';
import { modulesAroundStage, summarizeTrack } from './trackSummary';

function lesson(id: string, moduleId: string): LessonEntry {
  return { key: `demo/${id}`, id, folder: `demo/${moduleId}/${id}`, trackId: 'demo', moduleId, title: id, summary: '', level: 'beginner', tags: [], hasChallenge: true, hasQuiz: false };
}

function buildTrack(moduleCount: number, lessonsPerModule: number): Track {
  const modules: Module[] = Array.from({ length: moduleCount }, (_, moduleIndex) => {
    const id = `module-${moduleIndex + 1}`;
    return { id, trackId: 'demo', title: id, description: '', optional: false, lessons: Array.from({ length: lessonsPerModule }, (__, lessonIndex) => lesson(`${id}-lesson-${lessonIndex + 1}`, id)) };
  });
  return { id: 'demo', engine: 'typescript', languages: [], order: 1, title: 'Demo', monogram: 'D', description: '', version: '1', modules, lessons: modules.flatMap((module) => module.lessons) };
}

function progressWith(completed: string[], lastLesson?: string, visited: string[] = []): ProgressState {
  return {
    challenges: Object.fromEntries(completed.map((id) => [`demo/${id}`, true as const])),
    challengeLanguages: {},
    language: {},
    quizzes: {},
    visited: Object.fromEntries(visited.map((id) => [`demo/${id}`, true as const])),
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

describe('summarizeTrack with an optional module', () => {
  const base = buildTrack(3, 2);
  const track: Track = { ...base, modules: base.modules.map((module, index) => (index === 0 ? { ...module, optional: true } : module)) };
  const requiredLessons = track.modules.slice(1).flatMap((module) => module.lessons.map((entry) => entry.id));

  it('leaves a never started optional module out of done and total', () => {
    const summary = summarizeTrack(track, progressWith(['module-2-lesson-1'], 'module-2-lesson-1', ['module-2-lesson-1']));
    expect(summary).toMatchObject({ done: 1, total: 4, percent: 25, status: 'in-progress' });
  });

  it('completes the track when every required lesson is done and the optional module was skipped', () => {
    const summary = summarizeTrack(track, progressWith(requiredLessons, 'module-3-lesson-2', requiredLessons));
    expect(summary).toMatchObject({ done: 4, total: 4, percent: 100, status: 'completed' });
  });

  it('counts the optional module once one of its lessons was visited', () => {
    const summary = summarizeTrack(track, progressWith(requiredLessons, 'module-1-lesson-1', [...requiredLessons, 'module-1-lesson-1']));
    expect(summary).toMatchObject({ done: 4, total: 6, percent: 67, status: 'in-progress', currentModuleIndex: 0 });
  });

  it('counts the optional module once one of its lessons was completed', () => {
    const summary = summarizeTrack(track, progressWith(['module-1-lesson-2'], 'module-2-lesson-1'));
    expect(summary).toMatchObject({ done: 1, total: 6 });
  });

  it('still starts a fresh track at the first lesson of the optional module', () => {
    const summary = summarizeTrack(track, progressWith([]));
    expect(summary).toMatchObject({ status: 'not-started', done: 0, total: 4, currentModuleIndex: 0 });
    expect(summary.resumeLesson.id).toBe('module-1-lesson-1');
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
