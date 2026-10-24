import { installLoopGuard } from '../engines/shared/compile';
import { format } from '../engines/shared/expect';
import { installFakeApi } from '../engines/shared/fakeApi';
import { runTests, type FrameworkAdapter } from '../engines/shared/testRunner';
import type { ProjectFiles } from '../engines/shared/project';
import type { FrameworkEngine, SandboxRequest, SandboxResponse } from './protocol';

interface EngineModule {
  adapter: FrameworkAdapter;
  preview(files: ProjectFiles, entry: string, container: HTMLElement): void | Promise<void>;
}

const engines: Record<FrameworkEngine, () => Promise<EngineModule>> = {
  react: () => import('../engines/react/adapter').then((module) => ({ adapter: module.reactAdapter, preview: module.renderReactPreview })),
  vue: () => import('../engines/vue/adapter').then((module) => ({ adapter: module.vueAdapter, preview: module.renderVuePreview })),
  angular: () => import('../engines/angular/adapter').then((module) => ({ adapter: module.angularAdapter, preview: module.renderAngularPreview })),
};

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'preview';
const engineName = (params.get('engine') ?? 'react') as FrameworkEngine;

installLoopGuard(window);
installFakeApi(window, { delay: mode === 'test' ? 30 : 400 });

function post(message: SandboxResponse) {
  parent.postMessage(message, location.origin);
}

if (mode === 'preview') {
  (['log', 'info', 'warn', 'error'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      post({ type: 'console', level, text: args.map((arg) => (typeof arg === 'string' ? arg : format(arg))).join(' ') });
    };
  });
  window.addEventListener('error', (event) => post({ type: 'console', level: 'error', text: event.message }));
  window.addEventListener('unhandledrejection', (event) =>
    post({ type: 'console', level: 'error', text: `Unhandled rejection: ${String(event.reason?.message ?? event.reason)}` }),
  );
}

const engine = await engines[engineName]();
const root = document.getElementById('root')!;

window.addEventListener('message', async (event: MessageEvent<SandboxRequest>) => {
  if (event.origin !== location.origin) {
    return;
  }
  const message = event.data;
  if (message.type === 'preview') {
    await engine.preview(message.files, message.entry, root);
  }
  if (message.type === 'run-tests') {
    const report = await runTests(engine.adapter, { files: message.files, entry: message.entry, tests: message.tests });
    post({ type: 'test-report', id: message.id, report });
  }
});

post({ type: 'ready' });
