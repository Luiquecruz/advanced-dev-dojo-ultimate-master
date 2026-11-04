import { act, cleanup, render } from '@testing-library/react';
import { createElement, useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFiles } from '@/content';
import { progress, useProgress } from '@/entities/progress';
import { useLessonFiles } from './useLessonFiles';

const CODE_KEY = 'demo/intro';
const STARTER: ProjectFiles = { 'main.ts': 'start', 'util.ts': 'util' };

type Update = (name: string, value: string) => void;

function Subscriber() {
  const state = useProgress();
  return createElement('output', null, state.code[CODE_KEY]?.['main.ts'] ?? 'none');
}

function renderEditor(useEditor: () => { files: ProjectFiles; updateFile: Update }) {
  const handle: { update?: Update; files?: ProjectFiles } = {};
  function Editor() {
    const { files, updateFile } = useEditor();
    handle.update = updateFile;
    handle.files = files;
    return null;
  }
  render(createElement('div', null, createElement(Subscriber), createElement(Editor)));
  return handle;
}

/** The pattern LessonPage used before: the store write inside the state updater. */
function useUpdaterWrite() {
  const [files, setFiles] = useState(STARTER);
  const updateFile = useCallback((name: string, value: string) => {
    setFiles((current) => {
      const next = { ...current, [name]: value };
      progress.saveCode(CODE_KEY, next);
      return next;
    });
  }, []);
  return { files, updateFile };
}

function typeBurst(update: Update) {
  act(() => {
    update('main.ts', 'a');
    update('main.ts', 'ab');
    update('util.ts', 'changed');
  });
}

describe('useLessonFiles', () => {
  let errors: string[] = [];

  beforeEach(() => {
    progress.resetAll();
    errors = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(' ')));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderWarnings = () => errors.filter((message) => message.includes('Cannot update a component'));

  it('reproduces the warning when the store is written inside a state updater', () => {
    typeBurst(renderEditor(useUpdaterWrite).update!);
    expect(renderWarnings().length).toBeGreaterThan(0);
  });

  it('persists a burst of edits without updating subscribers during render', () => {
    const handle = renderEditor(() => useLessonFiles(CODE_KEY, () => STARTER));
    typeBurst(handle.update!);
    expect(renderWarnings()).toEqual([]);
    expect(handle.files).toEqual({ 'main.ts': 'ab', 'util.ts': 'changed' });
    expect(progress.getState().code[CODE_KEY]).toEqual({ 'main.ts': 'ab', 'util.ts': 'changed' });
  });

  it('applies edits on top of files replaced with setFiles', () => {
    const handle: { api?: ReturnType<typeof useLessonFiles> } = {};
    function Editor() {
      handle.api = useLessonFiles(CODE_KEY, () => STARTER);
      return null;
    }
    render(createElement(Editor));
    act(() => handle.api!.setFiles({ 'main.ts': 'solution' }));
    act(() => handle.api!.updateFile('extra.ts', 'x'));
    expect(handle.api!.files).toEqual({ 'main.ts': 'solution', 'extra.ts': 'x' });
  });
});
