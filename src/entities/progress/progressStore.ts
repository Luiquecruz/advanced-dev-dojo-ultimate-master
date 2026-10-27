import { useSyncExternalStore } from 'react';
import type { ProjectFiles, TrackId } from '@/content';

const STORAGE_KEY = 'dev-dojo:progress:v1';

export interface ProgressState {
  challenges: Record<string, true>;
  quizzes: Record<string, true>;
  visited: Record<string, true>;
  code: Record<string, ProjectFiles>;
  quizAnswers: Record<string, Record<number, number>>;
  lastLesson: Partial<Record<TrackId, string>>;
}

const empty: ProgressState = { challenges: {}, quizzes: {}, visited: {}, code: {}, quizAnswers: {}, lastLesson: {} };

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

let state = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persist(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      return;
    }
  }, 300);
}

function update(recipe: (current: ProgressState) => ProgressState): void {
  state = recipe(state);
  persist();
  listeners.forEach((listener) => listener());
}

export const progress = {
  getState(): ProgressState {
    return state;
  },
  saveCode(lessonKey: string, files: ProjectFiles) {
    update((current) => ({ ...current, code: { ...current.code, [lessonKey]: files } }));
  },
  clearCode(lessonKey: string) {
    update((current) => {
      const { [lessonKey]: _removed, ...code } = current.code;
      return { ...current, code };
    });
  },
  markChallenge(lessonKey: string) {
    update((current) => ({ ...current, challenges: { ...current.challenges, [lessonKey]: true } }));
  },
  markQuiz(lessonKey: string) {
    update((current) => ({ ...current, quizzes: { ...current.quizzes, [lessonKey]: true } }));
  },
  answerQuiz(lessonKey: string, question: number, option: number) {
    update((current) => ({
      ...current,
      quizAnswers: { ...current.quizAnswers, [lessonKey]: { ...current.quizAnswers[lessonKey], [question]: option } },
    }));
  },
  resetQuiz(lessonKey: string) {
    update((current) => ({ ...current, quizAnswers: { ...current.quizAnswers, [lessonKey]: {} } }));
  },
  visit(trackId: TrackId, lessonKey: string) {
    if (state.lastLesson[trackId] === lessonKey.split('/')[1] && state.visited[lessonKey]) {
      return;
    }
    update((current) => ({
      ...current,
      visited: { ...current.visited, [lessonKey]: true },
      lastLesson: { ...current.lastLesson, [trackId]: lessonKey.split('/')[1] },
    }));
  },
  resetAll() {
    update(() => empty);
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Reactive access to the learner progress persisted in localStorage.
 */
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, () => state);
}

/**
 * A lesson is complete when its challenge passed (if any) and its quiz was answered correctly (if any).
 */
export function isLessonComplete(state: ProgressState, lesson: { key: string; challenge?: unknown; quiz: unknown[] }): boolean {
  const challengeDone = !lesson.challenge || Boolean(state.challenges[lesson.key]);
  const quizDone = lesson.quiz.length === 0 || Boolean(state.quizzes[lesson.key]);
  return challengeDone && quizDone;
}
