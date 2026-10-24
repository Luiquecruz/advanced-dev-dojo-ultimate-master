import { reflectComponentType, type ApplicationRef, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { bootstrapApplication } from '@angular/platform-browser';
import { fireEvent, screen, waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { transpile } from '../shared/compile';
import { errorMessage, type FrameworkAdapter } from '../shared/testRunner';
import { compileProject, evaluateProject, type ProjectFiles } from '../shared/project';
import { angularJitTransformer } from './jitTransform';
import { angularRegistry } from './registry';

interface RenderOptions {
  inputs?: Record<string, unknown>;
  providers?: unknown[];
  imports?: unknown[];
}

let environmentReady = false;
let fixtures: ComponentFixture<unknown>[] = [];

function ensureEnvironment(): void {
  if (!environmentReady) {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), { teardown: { destroyAfterEach: true } });
    environmentReady = true;
  }
}

/**
 * Creates a component with TestBed, applies inputs and waits until it is stable.
 */
async function render<T>(component: Type<T>, { inputs = {}, providers = [], imports = [] }: RenderOptions = {}) {
  TestBed.configureTestingModule({ imports: [component, ...imports] as any[], providers: providers as any[] });
  const fixture = TestBed.createComponent(component);
  fixtures.push(fixture);
  Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    fixture,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
    setInput: async (name: string, value: unknown) => {
      fixture.componentRef.setInput(name, value);
      await fixture.whenStable();
    },
    stable: () => fixture.whenStable(),
  };
}

async function stable(): Promise<void> {
  await Promise.all(fixtures.map((fixture) => fixture.whenStable()));
}

function reset(): void {
  ensureEnvironment();
  fixtures = [];
  TestBed.resetTestingModule();
}

const compileFile = (name: string, code: string) => transpile(code, { fileName: name, transformers: [angularJitTransformer] });

export const angularAdapter: FrameworkAdapter = {
  registry: angularRegistry,
  testFileName: 'tests.ts',
  testTransformers: [angularJitTransformer],
  compileFile,
  createScope: () => ({
    TestBed,
    render,
    stable,
    screen,
    within,
    fireEvent,
    waitFor,
    userEvent,
    user: userEvent.setup(),
  }),
  beforeEach: reset,
  afterEach: reset,
};

let previewApp: ApplicationRef | null = null;

function findComponent(exports: Record<string, any>): Type<unknown> | undefined {
  const candidates = [exports.default, ...Object.values(exports)];
  return candidates.find((value) => typeof value === 'function' && reflectComponentType(value) !== null);
}

/**
 * Bootstraps the entry component (default export or first exported component) with an optional exported appConfig.
 */
export async function renderAngularPreview(files: ProjectFiles, entry: string, container: HTMLElement): Promise<void> {
  previewApp?.destroy();
  previewApp = null;
  container.innerHTML = '';
  try {
    const project = evaluateProject(compileProject(files, compileFile), entry, angularRegistry);
    const component = findComponent(project.entry);
    if (!component) {
      container.innerHTML = '<p class="dojo-preview-empty">Export a standalone component to see it here.</p>';
      return;
    }
    const selector = reflectComponentType(component)!.selector.split(',')[0].trim();
    const host = document.createElement(/^[a-z][\w-]*$/.test(selector) ? selector : 'app-root');
    container.appendChild(host);
    previewApp = await bootstrapApplication(component, project.entry.appConfig ?? { providers: [] });
  } catch (error) {
    container.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'dojo-preview-error';
    pre.textContent = errorMessage(error);
    container.appendChild(pre);
  }
}
