import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TypeScriptWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';
import type { EngineId } from '../content';
import { GLOBALS_DECLARATION, GLOBALS_FILE_NAME, TEST_HELPERS_DECLARATION, TEST_HELPERS_FILE_NAME } from '../engines/typescript/environment';

export const EDITOR_THEME = 'dev-dojo';

const MODULE_DETECTION_FORCE = 3;

declare global {
  interface Window {
    MonacoEnvironment: monaco.Environment;
  }
}

window.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TypeScriptWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};

const typescriptDefaults = monaco.typescript.typescriptDefaults;
const javascriptDefaults = monaco.typescript.javascriptDefaults;

typescriptDefaults.addExtraLib(GLOBALS_DECLARATION, `file:///${GLOBALS_FILE_NAME}`);
typescriptDefaults.addExtraLib(TEST_HELPERS_DECLARATION, `file:///${TEST_HELPERS_FILE_NAME}`);
typescriptDefaults.setEagerModelSync(true);

/**
 * Switches the TypeScript language service between strict checking (TypeScript track) and syntax-only checking (framework tracks).
 */
export function configureLanguageService(engine: EngineId): void {
  const strictTrack = engine === 'typescript';
  const options: monaco.typescript.CompilerOptions = {
    target: monaco.typescript.ScriptTarget.ESNext,
    module: monaco.typescript.ModuleKind.ESNext,
    moduleDetection: MODULE_DETECTION_FORCE,
    lib: strictTrack ? ['esnext'] : ['esnext', 'dom', 'dom.iterable'],
    strict: true,
    noImplicitOverride: strictTrack,
    noFallthroughCasesInSwitch: true,
    allowNonTsExtensions: true,
    jsx: monaco.typescript.JsxEmit.ReactJSX,
    experimentalDecorators: engine === 'angular',
  };
  typescriptDefaults.setCompilerOptions(options);
  javascriptDefaults.setCompilerOptions({ ...options, allowJs: true, checkJs: false });
  const diagnostics = { noSemanticValidation: !strictTrack, noSyntaxValidation: false, noSuggestionDiagnostics: !strictTrack };
  typescriptDefaults.setDiagnosticsOptions(diagnostics);
  javascriptDefaults.setDiagnosticsOptions({ ...diagnostics, noSemanticValidation: true });
}

monaco.editor.defineTheme(EDITOR_THEME, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '7f8ea3', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c792ea' },
    { token: 'string', foreground: 'c3e88d' },
    { token: 'number', foreground: 'f78c6c' },
    { token: 'type', foreground: 'ffcb6b' },
    { token: 'type.identifier', foreground: 'ffcb6b' },
    { token: 'tag', foreground: 'f07178' },
    { token: 'attribute.name', foreground: 'ffcb6b' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.lineHighlightBackground': '#151b26',
    'editorLineNumber.foreground': '#3a465c',
    'editorLineNumber.activeForeground': '#9fb0cc',
    'editorGutter.background': '#0d1117',
    'editor.selectionBackground': '#2a3d63',
    'editorIndentGuide.background1': '#1c2538',
    'editorWidget.background': '#141a24',
  },
});
monaco.editor.setTheme(EDITOR_THEME);

/**
 * Maps a project file name to a Monaco language id.
 */
export function languageForFile(fileName: string): string {
  if (/\.(ts|tsx)$/.test(fileName)) return 'typescript';
  if (/\.(js|jsx)$/.test(fileName)) return 'javascript';
  if (fileName.endsWith('.vue') || fileName.endsWith('.html')) return 'html';
  if (fileName.endsWith('.css')) return 'css';
  if (fileName.endsWith('.json')) return 'json';
  return 'plaintext';
}

export { monaco };
