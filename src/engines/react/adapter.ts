import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { transpile } from '../shared/compile';
import { errorMessage, type FrameworkAdapter } from '../shared/testRunner';
import { compileProject, evaluateProject, type ProjectFiles } from '../shared/project';
import { reactRegistry } from './registry';

const compileFile = (name: string, code: string) => transpile(code, { fileName: name.replace(/\.(js|ts)$/, '.$1x') });

export const reactAdapter: FrameworkAdapter = {
  registry: reactRegistry,
  testFileName: 'tests.tsx',
  compileFile,
  createScope: () => ({
    React,
    render,
    renderHook,
    screen,
    within,
    fireEvent,
    waitFor,
    act,
    userEvent,
    user: userEvent.setup(),
  }),
  beforeEach() {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    cleanup();
  },
  afterEach() {
    cleanup();
  },
};

class PreviewBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return React.createElement('pre', { className: 'dojo-preview-error' }, errorMessage(this.state.error));
    }
    return this.props.children;
  }
}

let previewRoot: Root | null = null;

/**
 * Renders the default export of the entry file.
 */
export function renderReactPreview(files: ProjectFiles, entry: string, container: HTMLElement): void {
  previewRoot?.unmount();
  container.innerHTML = '';
  previewRoot = createRoot(container);
  let element: React.ReactNode;
  try {
    const project = evaluateProject(compileProject(files, compileFile), entry, reactRegistry);
    const Component = project.entry.default;
    element = Component
      ? React.createElement(Component)
      : React.createElement('p', { className: 'dojo-preview-empty' }, 'Export a component as default to see it here.');
  } catch (error) {
    element = React.createElement('pre', { className: 'dojo-preview-error' }, errorMessage(error));
  }
  previewRoot.render(React.createElement(PreviewBoundary, null, element));
}
