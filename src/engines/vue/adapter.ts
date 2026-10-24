import { createApp, nextTick, type App } from 'vue';
import { flushPromises, mount, shallowMount, type VueWrapper } from '@vue/test-utils';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { errorMessage, type FrameworkAdapter } from '../shared/testRunner';
import { compileProject, evaluateProject, type ProjectFiles } from '../shared/project';
import { vueRegistry } from './registry';
import { compileVueFile } from './sfc';

let wrappers: VueWrapper[] = [];

function track<T extends (...args: any[]) => VueWrapper>(mounter: T): T {
  return ((...args: any[]) => {
    const wrapper = mounter(...args);
    wrappers.push(wrapper);
    return wrapper;
  }) as T;
}

function unmountAll(): void {
  wrappers.forEach((wrapper) => wrapper.unmount());
  wrappers = [];
  cleanup();
  document.querySelectorAll('style[data-dojo-style]').forEach((style) => style.remove());
}

export const vueAdapter: FrameworkAdapter = {
  registry: vueRegistry,
  testFileName: 'tests.ts',
  compileFile: compileVueFile,
  createScope: () => ({
    mount: track(mount as any),
    shallowMount: track(shallowMount as any),
    flushPromises,
    nextTick,
    render,
    screen,
    within,
    fireEvent,
    waitFor,
    userEvent,
    user: userEvent.setup(),
  }),
  beforeEach: unmountAll,
  afterEach: unmountAll,
};

let previewApp: App | null = null;

/**
 * Mounts the default export of the entry file, calling an exported configureApp(app) first.
 */
export function renderVuePreview(files: ProjectFiles, entry: string, container: HTMLElement): void {
  previewApp?.unmount();
  previewApp = null;
  container.innerHTML = '';
  document.querySelectorAll('style[data-dojo-style]').forEach((style) => style.remove());
  const showError = (error: unknown) => {
    container.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'dojo-preview-error';
    pre.textContent = errorMessage(error);
    container.appendChild(pre);
  };
  try {
    const project = evaluateProject(compileProject(files, compileVueFile), entry, vueRegistry);
    const component = project.entry.default;
    if (!component) {
      container.innerHTML = '<p class="dojo-preview-empty">Export a component as default to see it here.</p>';
      return;
    }
    const app = createApp(component);
    app.config.errorHandler = (error) => showError(error);
    project.entry.configureApp?.(app);
    const host = document.createElement('div');
    container.appendChild(host);
    app.mount(host);
    previewApp = app;
  } catch (error) {
    showError(error);
  }
}
