import { describe, expect, it } from 'vitest';
import type { LessonEntry, Module, Track } from '@/content';
import { summarizeTrack, type ProgressState } from '@/entities/progress';
import { stageLine } from './stageLine';

function lesson(id: string, moduleId: string): LessonEntry {
  return { key: `demo/${id}`, id, folder: `demo/${moduleId}/${id}`, trackId: 'demo', moduleId, title: id, summary: '', level: 'beginner', tags: [], hasChallenge: true, hasQuiz: false };
}

function module(number: number, optional: boolean): Module {
  const id = `module-${number}`;
  return { id, number, trackId: 'demo', title: `Module ${number}`, description: '', optional, lessons: [1, 2, 3].map((index) => lesson(`${id}-lesson-${index}`, id)) };
}

function progressWith(completed: string[], lastLesson?: string): ProgressState {
  return {
    challenges: Object.fromEntries(completed.map((id) => [`demo/${id}`, true as const])),
    challengeLanguages: {},
    language: {},
    quizzes: {},
    visited: {},
    code: {},
    quizAnswers: {},
    lastLesson: lastLesson ? { demo: lastLesson } : {},
  };
}

const modules = [module(0, true), ...Array.from({ length: 14 }, (_, index) => module(index + 1, false))];
const track: Track = { id: 'demo', engine: 'csharp', languages: [], order: 1, title: 'Demo', monogram: 'D', description: '', version: '1', modules, lessons: modules.flatMap((entry) => entry.lessons) };
const requiredLessons = modules.filter((entry) => !entry.optional).flatMap((entry) => entry.lessons.map((item) => item.id));

describe('stageLine', () => {
  it('counts the required stages of a completed track', () => {
    expect(stageLine(summarizeTrack(track, progressWith(requiredLessons, 'module-14-lesson-3')))).toBe('All 14 stages done');
  });

  it('names the optional module the resume lesson sits in', () => {
    expect(stageLine(summarizeTrack(track, progressWith([], 'module-0-lesson-2')))).toBe('Optional module 00 · Module 0');
  });

  it('numbers a required stage by its folder prefix on a track with a module zero', () => {
    expect(stageLine(summarizeTrack(track, progressWith(['module-0-lesson-1'], 'module-1-lesson-1')))).toBe('Stage 1 of 14 · Module 1');
  });
});
