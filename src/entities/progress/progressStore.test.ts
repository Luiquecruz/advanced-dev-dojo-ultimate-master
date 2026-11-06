import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { codeKeyFor, isLessonComplete, progress } from './progressStore';

const STORAGE_KEY = 'dev-dojo:progress:v1';
const lesson = { key: 'demo/intro', hasChallenge: true, hasQuiz: true };

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

  it('completes a multi-language challenge in any language and records each passing language', () => {
    progress.markQuiz(lesson.key);
    progress.markChallenge(lesson.key, 'python');
    expect(isLessonComplete(progress.getState(), lesson)).toBe(true);
    progress.markChallenge(lesson.key, 'node');
    expect(progress.getState().challengeLanguages[lesson.key]).toEqual({ python: true, node: true });
  });

  it('remembers the chosen language per track and keeps code per language', () => {
    progress.chooseLanguage('demo', 'python');
    progress.saveCode(codeKeyFor(lesson.key, 'python'), { 'main.py': 'print(1)' });
    progress.saveCode(codeKeyFor(lesson.key, 'node'), { 'main.ts': 'console.log(1)' });
    expect(progress.getState().language.demo).toBe('python');
    expect(progress.getState().code[codeKeyFor(lesson.key, 'python')]).toEqual({ 'main.py': 'print(1)' });
    expect(codeKeyFor(lesson.key)).toBe(lesson.key);
  });

  it('loads legacy State Management drafts into React and does not resurrect a cleared draft', async () => {
    const key = 'react-state/local-state-and-derived-values';
    const draft = { 'App.jsx': 'export default function App() { return <p>saved</p>; }' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: { [key]: draft }, challenges: { [key]: true } }));
    vi.resetModules();
    const { progress: restored } = await import('./progressStore');
    expect(restored.getState().code[`${key}#react`]).toEqual(draft);
    expect(restored.getState().challengeLanguages[key]).toEqual({ react: true });
    restored.clearCode(`${key}#react`);
    vi.advanceTimersByTime(300);
    vi.resetModules();
    const { progress: reopened } = await import('./progressStore');
    expect(reopened.getState().code[`${key}#react`]).toBeUndefined();
    expect(reopened.getState().code[key]).toBeUndefined();
    expect(reopened.getState().challenges[key]).toBe(true);
  });

});
