import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Challenge, Lesson, Track } from '@/content';
import { progress } from '@/entities/progress';
import { LessonPage } from './LessonPage';

vi.mock('@/features/lesson', () => ({
  canRunProgram: () => false,
  CodeEditor: () => null,
  configureLanguageService: () => {},
  gradeChallenge: async () => ({ passed: false, tests: [], logs: [] }),
  LanguageSwitch: () => null,
  LessonPanel: () => createElement('div', null, 'Lesson content'),
  prepareEngine: () => {},
  PreviewFrame: () => null,
  ReportProblemDialog: () => null,
  runProgram: () => {},
  TestName: () => null,
  testNamesFor: () => [],
}));
vi.mock('@/features/curriculum', () => ({ CurriculumDrawer: () => null }));
vi.mock('@/shared/lib/useMediaQuery', () => ({ useMediaQuery: () => true }));

const challenge: Challenge = {
  engine: 'typescript', instructions: '', starter: { 'main.ts': '' }, solution: {}, entry: 'main.ts',
  tests: '', hints: [], approach: '', preview: false,
};
const lesson: Lesson = {
  key: 'test/lesson', id: 'lesson', folder: '', trackId: 'test', moduleId: 'module', title: 'Lesson',
  summary: '', level: 'beginner', tags: [], hasChallenge: true, hasQuiz: false, theory: '', concepts: [],
  challenge, variants: [], quiz: [], resources: [],
};
const track: Track = {
  id: 'test', engine: 'typescript', languages: [], order: 0, title: 'Test', monogram: 'T',
  description: '', version: '', modules: [], lessons: [lesson],
};

afterEach(() => {
  cleanup();
  progress.resetAll();
});

describe('mobile workspace tabs', () => {
  it('moves focus with wrapping arrows and activates only on click, Enter or Space', async () => {
    const user = userEvent.setup();
    render(createElement(MemoryRouter, null, createElement(LessonPage, { track, lesson })));
    const tablist = screen.getByRole('tablist', { name: 'Workspace areas' });
    const [waypoint, code, output] = within(tablist).getAllByRole('tab');
    const tabIndexes = () => [waypoint.tabIndex, code.tabIndex, output.tabIndex];

    expect(tabIndexes()).toEqual([0, -1, -1]);
    waypoint.focus();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(output);
    expect(tabIndexes()).toEqual([-1, -1, 0]);
    expect(waypoint.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(code);
    expect(tabIndexes()).toEqual([-1, 0, -1]);
    expect(waypoint.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{Enter}');
    expect(code.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowRight} ');
    expect(output.getAttribute('aria-selected')).toBe('true');
    await user.click(waypoint);
    expect(waypoint.getAttribute('aria-selected')).toBe('true');

    await user.keyboard('{ArrowRight}');
    await user.tab();
    expect(tabIndexes()).toEqual([0, -1, -1]);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(waypoint);
  });

  it('returns focus to the pane selected by an editor action', async () => {
    const user = userEvent.setup();
    render(createElement(MemoryRouter, null, createElement(LessonPage, { track, lesson })));
    const tablist = screen.getByRole('tablist', { name: 'Workspace areas' });
    const [waypoint, code, output] = within(tablist).getAllByRole('tab');
    await user.click(code);
    await user.click(screen.getByRole('button', { name: 'Run tests' }));
    expect(output.getAttribute('aria-selected')).toBe('true');
    expect([waypoint.tabIndex, code.tabIndex, output.tabIndex]).toEqual([-1, -1, 0]);
  });
});
