import { describe, expect, it } from 'vitest';
import type { ProgressState } from './progressStore';
import { migrateStateManagementProgress } from './legacyStateProgress';

function state(overrides: Partial<ProgressState>): ProgressState {
  return { challenges: {}, challengeLanguages: {}, language: {}, quizzes: {}, visited: {}, code: {}, quizAnswers: {}, lastLesson: {}, ...overrides };
}

describe('State Management progress compatibility', () => {
  it('keeps existing React drafts and completed lessons when variant storage is introduced', () => {
    const key = 'react-state/local-state-and-derived-values';
    const draft = { 'App.jsx': 'export default function App() { return <p>My work</p>; }' };
    const previous = state({ code: { [key]: draft, 'react/first-component': { 'App.jsx': 'other' } }, challenges: { [key]: true }, quizzes: { [key]: true }, lastLesson: { 'react-state': 'local-state-and-derived-values' } });
    const migrated = migrateStateManagementProgress(previous);
    expect(migrated.code[`${key}#react`]).toEqual(draft);
    expect(migrated.code[key]).toBeUndefined();
    expect(migrated.challenges[key]).toBe(true);
    expect(migrated.quizzes[key]).toBe(true);
    expect(migrated.challengeLanguages[key]).toEqual({ react: true });
    expect(migrated.lastLesson).toEqual(previous.lastLesson);
    expect(migrated.code['react/first-component']).toEqual({ 'App.jsx': 'other' });
    expect(previous.code[key]).toEqual(draft);
  });

  it('retains newer variant drafts and Angular passes and is safe to run again', () => {
    const key = 'react-state/context-api-done-right';
    const angularKey = 'react-state/ngrx-signal-store';
    const previous = state({
      code: { [key]: { 'App.jsx': 'old' }, [`${key}#react`]: { 'App.jsx': 'new' }, [`${angularKey}#angular`]: { 'app.ts': 'angular' } },
      challenges: { [angularKey]: true },
      challengeLanguages: { [angularKey]: { angular: true } },
    });
    const migrated = migrateStateManagementProgress(previous);
    expect(migrated.code[`${key}#react`]).toEqual({ 'App.jsx': 'new' });
    expect(migrated.code[`${angularKey}#angular`]).toEqual({ 'app.ts': 'angular' });
    expect(migrated.challengeLanguages[angularKey]).toEqual({ angular: true });
    expect(migrateStateManagementProgress(migrated)).toEqual(migrated);
  });
});
