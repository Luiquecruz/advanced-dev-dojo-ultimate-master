import type * as TypeScript from 'typescript';
import {
  GLOBALS_DECLARATION,
  GLOBALS_FILE_NAME,
  LIB_FILE_NAME,
  TEST_HELPERS_DECLARATION,
  TEST_HELPERS_FILE_NAME,
} from './environment';
import type { CodeDiagnostic, PatternTest, StaticAnalysis, TestResult, TypeTest } from './types';

type TypeScriptApi = typeof TypeScript;

interface LineRange {
  start: number;
  end: number;
}

const MAIN_FILE_PATH = '/main.ts';
const LIB_DIRECTORY = '/lib';
const MAX_REPORTED_DIAGNOSTICS = 5;

export interface StaticAnalysisRequest {
  code: string;
  typeTests: TypeTest[];
  patternTests: PatternTest[];
}

/**
 * Type checks learner code against type tests, evaluates pattern tests and transpiles the code to JavaScript.
 */
export function createStaticAnalyzer(ts: TypeScriptApi, libraries: Record<string, string>) {
  const ambientFiles: Record<string, string> = {
    [GLOBALS_FILE_NAME]: GLOBALS_DECLARATION,
    [TEST_HELPERS_FILE_NAME]: TEST_HELPERS_DECLARATION,
  };
  const sourceFileCache = new Map<string, TypeScript.SourceFile>();
  const compilerOptions: TypeScript.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleDetection: ts.ModuleDetectionKind.Force,
    lib: [LIB_FILE_NAME],
    types: [],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    noImplicitOverride: true,
    noFallthroughCasesInSwitch: true,
  };
  const rootNames = [MAIN_FILE_PATH, `/${GLOBALS_FILE_NAME}`, `/${TEST_HELPERS_FILE_NAME}`];
  let previousProgram: TypeScript.Program | undefined;

  function baseName(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
  }

  function readKnownFile(path: string): string | undefined {
    const name = baseName(path);
    return libraries[name] ?? ambientFiles[name];
  }

  function createHost(mainSource: string): TypeScript.CompilerHost {
    return {
      getSourceFile(fileName, languageVersion) {
        if (fileName === MAIN_FILE_PATH) {
          return ts.createSourceFile(fileName, mainSource, languageVersion, true);
        }
        const name = baseName(fileName);
        const cached = sourceFileCache.get(name);
        if (cached) {
          return cached;
        }
        const text = readKnownFile(fileName);
        if (text === undefined) {
          return undefined;
        }
        const sourceFile = ts.createSourceFile(fileName, text, languageVersion, false);
        sourceFileCache.set(name, sourceFile);
        return sourceFile;
      },
      getDefaultLibFileName: () => `${LIB_DIRECTORY}/${LIB_FILE_NAME}`,
      getDefaultLibLocation: () => LIB_DIRECTORY,
      writeFile: () => undefined,
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (fileName) => fileName === MAIN_FILE_PATH || readKnownFile(fileName) !== undefined,
      readFile: (fileName) => (fileName === MAIN_FILE_PATH ? mainSource : readKnownFile(fileName)),
    };
  }

  function composeSource(code: string, typeTests: TypeTest[]): { source: string; userLineCount: number; ranges: LineRange[] } {
    const lines = code.split('\n');
    const userLineCount = lines.length;
    const ranges = typeTests.map((test) => {
      const start = lines.length;
      lines.push('{', ...test.code.split('\n'), '}');
      return { start, end: lines.length - 1 };
    });
    return { source: lines.join('\n'), userLineCount, ranges };
  }

  function toDiagnostic(diagnostic: TypeScript.Diagnostic): CodeDiagnostic {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    if (!diagnostic.file || diagnostic.start === undefined) {
      return { line: 0, column: 0, message, code: diagnostic.code };
    }
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return { line: position.line, column: position.character, message, code: diagnostic.code };
  }

  function describeDiagnostics(diagnostics: CodeDiagnostic[]): string {
    const listed = diagnostics
      .slice(0, MAX_REPORTED_DIAGNOSTICS)
      .map((diagnostic) => `Line ${diagnostic.line + 1}: ${diagnostic.message}`);
    const remaining = diagnostics.length - listed.length;
    return remaining > 0 ? [...listed, `…and ${remaining} more`].join('\n') : listed.join('\n');
  }

  function stripComments(code: string): string {
    try {
      const sourceFile = ts.createSourceFile('/pattern.ts', code, ts.ScriptTarget.ES2022, false);
      return ts.createPrinter({ removeComments: true }).printFile(sourceFile);
    } catch {
      return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    }
  }

  function evaluatePatternTests(code: string, patternTests: PatternTest[]): TestResult[] {
    const printedCode = stripComments(code);
    return patternTests.map((test) => {
      const matched = new RegExp(test.pattern, test.flags).test(printedCode);
      const passed = matched === test.mustMatch;
      return {
        name: test.name,
        kind: 'pattern',
        passed,
        message: passed ? undefined : test.mustMatch ? 'Required construct not found in your code.' : 'Your code uses a construct that is not allowed here.',
      };
    });
  }

  function transpile(code: string): string {
    return ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        moduleDetection: ts.ModuleDetectionKind.Force,
        preserveConstEnums: true,
        useDefineForClassFields: true,
      },
      reportDiagnostics: false,
    }).outputText;
  }

  function analyze(request: StaticAnalysisRequest): StaticAnalysis {
    const { source, userLineCount, ranges } = composeSource(request.code, request.typeTests);
    const program = ts.createProgram({
      rootNames,
      options: compilerOptions,
      host: createHost(source),
      oldProgram: previousProgram,
    });
    previousProgram = program;
    const mainFile = program.getSourceFile(MAIN_FILE_PATH);
    const allDiagnostics = [
      ...program.getSyntacticDiagnostics(mainFile),
      ...program.getSemanticDiagnostics(mainFile),
    ].map(toDiagnostic);

    const diagnostics = allDiagnostics.filter((diagnostic) => diagnostic.line < userLineCount);
    const compileTest: TestResult = {
      name: 'Your code compiles without type errors',
      kind: 'compile',
      passed: diagnostics.length === 0,
      message: diagnostics.length === 0 ? undefined : describeDiagnostics(diagnostics),
    };

    const typeTests = request.typeTests.map((test, index): TestResult => {
      const range = ranges[index];
      const failures = allDiagnostics.filter((diagnostic) => diagnostic.line >= range.start && diagnostic.line <= range.end);
      return {
        name: test.name,
        kind: 'type',
        passed: failures.length === 0,
        message: failures.length === 0 ? undefined : failures.map((failure) => failure.message).join('\n'),
      };
    });

    return {
      diagnostics,
      compileTest,
      typeTests,
      patternTests: evaluatePatternTests(request.code, request.patternTests),
      javascript: transpile(request.code),
    };
  }

  return { analyze };
}
