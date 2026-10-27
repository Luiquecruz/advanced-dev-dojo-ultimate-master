import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLessonComplete, progress } from './progressStore';

const STORAGE_KEY = 'dev-dojo:progress:v1';
const lesson = { key: 'demo/intro', challenge: {}, quiz: [{}] };

describe('progress store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    progress.resetAll();
  });

  afterEach(() => vi.useRealTimers());

  it('completes a lesson only when both its challenge and its quiz are done', () => {
    progress.markChallenge(lesson.key);
    expect(isLessonComplete(progress.getState(), lesson)).toBe(false);
    progress.markQuiz(lesson.key);
    expect(isLessonComplete(progress.getState(), lesson)).toBe(true);
  });

  it('persists to localStorage after a short debounce', () => {
    progress.saveCode(lesson.key, { 'main.ts': 'const answer = 42;' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').code?.[lesson.key]).toBeUndefined();
    vi.advanceTimersByTime(300);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).code[lesson.key]).toEqual({ 'main.ts': 'const answer = 42;' });
  });

  it('records the last visited lesson per track', () => {
    progress.visit('demo', 'demo/intro');
    expect(progress.getState().lastLesson.demo).toBe('intro');
    expect(progress.getState().visited['demo/intro']).toBe(true);
  });
});
