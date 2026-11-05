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
    return { id, number: moduleIndex + 1, trackId: 'demo', title: id, description: '', optional: false, lessons: Array.from({ length: lessonsPerModule }, (__, lessonIndex) => lesson(`${id}-lesson-${lessonIndex + 1}`, id)) };
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

  it('resumes the next unfinished lesson when the last visited lesson is complete', () => {
    const summary = summarizeTrack(track, progressWith(['module-1-lesson-1', 'module-3-lesson-1'], 'module-3-lesson-1'));
    expect(summary.resumeLesson.id).toBe('module-3-lesson-2');
    expect(summary.currentModuleIndex).toBe(2);
  });

  it('reports a completed track', () => {
    const summary = summarizeTrack(track, progressWith(track.lessons.map((entry) => entry.id)));
    expect(summary).toMatchObject({ status: 'completed', percent: 100 });
  });
});

describe('summarizeTrack with an optional module', () => {
  const base = buildTrack(3, 4);
  const track: Track = { ...base, modules: base.modules.map((module, index) => (index === 0 ? { ...module, number: 0, optional: true } : module)) };
  const optionalLessons = track.modules[0].lessons.map((entry) => entry.id);
  const requiredLessons = track.modules.slice(1).flatMap((module) => module.lessons.map((entry) => entry.id));

  it('leaves a never started optional module out of done and total', () => {
    const summary = summarizeTrack(track, progressWith(['module-2-lesson-1'], 'module-2-lesson-1', ['module-2-lesson-1']));
    expect(summary).toMatchObject({ done: 1, total: 8, percent: 13, status: 'in-progress', lastStageNumber: 3 });
  });

  it('completes the track when every required lesson is done and the optional module was skipped', () => {
    const summary = summarizeTrack(track, progressWith(requiredLessons, 'module-3-lesson-4', requiredLessons));
    expect(summary).toMatchObject({ done: 8, total: 8, percent: 100, status: 'completed' });
    expect(summary.modules.map((module) => module.state)).toEqual(['optional', 'done', 'done']);
  });

  it('does not count a visit to an optional lesson nor make its module the current stage of a completed track', () => {
    const summary = summarizeTrack(track, progressWith(requiredLessons, 'module-1-lesson-1', [...requiredLessons, 'module-1-lesson-1']));
    expect(summary).toMatchObject({ done: 8, total: 8, percent: 100, status: 'completed', currentModuleIndex: 0 });
    expect(summary.modules.map((module) => module.state)).toEqual(['optional', 'done', 'done']);
  });

  it('starts the optional module when its first lesson has a challenge and is complete', () => {
    const summary = summarizeTrack(track, progressWith([...requiredLessons, 'module-1-lesson-1'], 'module-1-lesson-2'));
    expect(summary).toMatchObject({ done: 9, total: 12, percent: 75, status: 'in-progress', currentModuleIndex: 0 });
    expect(summary.modules.map((module) => module.state)).toEqual(['current', 'done', 'done']);
  });

  it('does not start the optional module when only its last lesson, the skip test, is complete', () => {
    const summary = summarizeTrack(track, progressWith([...requiredLessons, 'module-1-lesson-4'], 'module-1-lesson-4'));
    expect(summary).toMatchObject({ done: 8, total: 8, percent: 100, status: 'completed' });
    expect(summary.modules.map((module) => module.state)).toEqual(['optional', 'done', 'done']);
  });

  it('counts the whole optional module once a lesson between its first and last is complete', () => {
    const summary = summarizeTrack(track, progressWith([...requiredLessons, 'module-1-lesson-2'], 'module-1-lesson-3'));
    expect(summary).toMatchObject({ done: 9, total: 12, percent: 75, status: 'in-progress', currentModuleIndex: 0 });
    expect(summary.modules.map((module) => module.state)).toEqual(['current', 'done', 'done']);
  });

  it('completes the track once a started optional module is finished too', () => {
    const summary = summarizeTrack(track, progressWith([...optionalLessons, ...requiredLessons], 'module-3-lesson-4'));
    expect(summary).toMatchObject({ done: 12, total: 12, percent: 100, status: 'completed' });
    expect(summary.modules.map((module) => module.state)).toEqual(['done', 'done', 'done']);
  });

  it('counts a started optional module toward an unfinished track', () => {
    const summary = summarizeTrack(track, progressWith(['module-1-lesson-2'], 'module-2-lesson-1'));
    expect(summary).toMatchObject({ done: 1, total: 12, percent: 8, status: 'in-progress' });
    expect(summary.modules.map((module) => module.state)).toEqual(['optional', 'current', 'upcoming']);
  });

  describe('whose first lesson is a quiz-only map', () => {
    const mapTrack: Track = {
      ...track,
      modules: track.modules.map((module, index) =>
        index === 0 ? { ...module, lessons: module.lessons.map((entry, lessonIndex) => (lessonIndex === 0 ? { ...entry, hasChallenge: false, hasQuiz: true } : entry)) } : module,
      ),
    };
    const withMapPassed = (completed: string[], lastLesson: string): ProgressState => ({ ...progressWith(completed, lastLesson), quizzes: { 'demo/module-1-lesson-1': true as const } });

    it('does not start the module when only the map is passed', () => {
      expect(summarizeTrack(mapTrack, withMapPassed(requiredLessons, 'module-1-lesson-1'))).toMatchObject({ done: 8, total: 8, status: 'completed' });
    });

    it('does not start the module when only the map and the skip test are passed', () => {
      expect(summarizeTrack(mapTrack, withMapPassed([...requiredLessons, 'module-1-lesson-4'], 'module-1-lesson-4'))).toMatchObject({ done: 8, total: 8, status: 'completed' });
    });

    it('starts the module once a challenge lesson after the map is complete', () => {
      expect(summarizeTrack(mapTrack, withMapPassed([...requiredLessons, 'module-1-lesson-2'], 'module-1-lesson-3'))).toMatchObject({ done: 10, total: 12, status: 'in-progress' });
    });
  });

  it('resumes an unfinished lesson of a started optional module once the required lessons are done', () => {
    const summary = summarizeTrack(track, progressWith([...requiredLessons, 'module-1-lesson-2'], 'module-3-lesson-4'));
    expect(summary).toMatchObject({ done: 9, total: 12, status: 'in-progress', currentModuleIndex: 0 });
    expect(summary.resumeLesson.id).toBe('module-1-lesson-1');
    expect(summary.modules.map((module) => module.state)).toEqual(['current', 'done', 'done']);
  });

  it('does not resume a never started optional module', () => {
    const summary = summarizeTrack(track, progressWith(['module-2-lesson-1'], 'module-2-lesson-1'));
    expect(summary.resumeLesson.id).toBe('module-2-lesson-2');
  });

  it('still starts a fresh track at the first lesson of the optional module', () => {
    const summary = summarizeTrack(track, progressWith([]));
    expect(summary).toMatchObject({ status: 'not-started', done: 0, total: 8, currentModuleIndex: 0 });
    expect(summary.resumeLesson.id).toBe('module-1-lesson-1');
    expect(summary.modules[0].state).toBe('current');
  });

  it('reports a track whose modules are all optional and untouched as not started', () => {
    const optionalTrack: Track = { ...base, modules: base.modules.map((module) => ({ ...module, optional: true })) };
    expect(summarizeTrack(optionalTrack, progressWith([]))).toMatchObject({ done: 0, total: 0, percent: 0, status: 'not-started', lastStageNumber: 0 });
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
