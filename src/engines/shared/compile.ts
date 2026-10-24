import ts from 'typescript';

export type JsxMode = 'automatic' | 'classic';

export interface TranspileOptions {
  fileName: string;
  jsx?: JsxMode;
  transformers?: ts.TransformerFactory<ts.SourceFile>[];
}

const LOOP_GUARD = '__dojoLoopGuard';
const LOOP_LIMIT_MS = 1500;

export class CompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompileError';
  }
}

/**
 * Installs the global guard called on every loop iteration of learner code.
 */
export function installLoopGuard(target: typeof globalThis): void {
  let startedAt = 0;
  let scheduled = false;
  let iterations = 0;
  (target as any)[LOOP_GUARD] = () => {
    if (!scheduled) {
      scheduled = true;
      startedAt = Date.now();
      iterations = 0;
      setTimeout(() => {
        scheduled = false;
      }, 0);
    }
    iterations++;
    if (iterations % 1000 === 0 && Date.now() - startedAt > LOOP_LIMIT_MS) {
      throw new RangeError(`Potential infinite loop detected: a loop ran for more than ${LOOP_LIMIT_MS}ms.`);
    }
  };
}

const loopGuardTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
  const { factory } = context;
  const guardCall = () =>
    factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier(LOOP_GUARD), undefined, []));
  const guardBody = (body: ts.Statement) =>
    ts.isBlock(body) ? factory.updateBlock(body, [guardCall(), ...body.statements]) : factory.createBlock([guardCall(), body], true);

  const visit = (node: ts.Node): ts.Node => {
    const visited = ts.visitEachChild(node, visit, context);
    if (ts.isWhileStatement(visited)) {
      return factory.updateWhileStatement(visited, visited.expression, guardBody(visited.statement));
    }
    if (ts.isDoStatement(visited)) {
      return factory.updateDoStatement(visited, guardBody(visited.statement), visited.expression);
    }
    if (ts.isForStatement(visited)) {
      return factory.updateForStatement(visited, visited.initializer, visited.condition, visited.incrementor, guardBody(visited.statement));
    }
    if (ts.isForOfStatement(visited)) {
      return factory.updateForOfStatement(visited, visited.awaitModifier, visited.initializer, visited.expression, guardBody(visited.statement));
    }
    if (ts.isForInStatement(visited)) {
      return factory.updateForInStatement(visited, visited.initializer, visited.expression, guardBody(visited.statement));
    }
    return visited;
  };

  return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
};

/**
 * Transpiles TS/TSX/JS/JSX learner code into CommonJS with a loop guard.
 */
export function transpile(code: string, { fileName, jsx = 'automatic', transformers = [] }: TranspileOptions): string {
  const result = ts.transpileModule(code, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: jsx === 'automatic' ? ts.JsxEmit.ReactJSX : ts.JsxEmit.React,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      useDefineForClassFields: false,
      esModuleInterop: true,
      allowJs: true,
      sourceMap: false,
    },
    transformers: { before: [...transformers, loopGuardTransformer] },
  });
  const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    throw new CompileError(errors.map((diagnostic) => describeDiagnostic(diagnostic)).join('\n'));
  }
  return result.outputText;
}

function describeDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (!diagnostic.file || diagnostic.start === undefined) {
    return message;
  }
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${diagnostic.file.fileName}:${line + 1}:${character + 1} ${message}`;
}

/**
 * Removes comments from TS/TSX/JS code by reprinting it.
 */
export function stripScriptComments(code: string, fileName = 'file.tsx'): string {
  try {
    const kind = /\.(t|j)sx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2022, false, kind);
    if ((sourceFile as any).parseDiagnostics?.length) {
      return naiveStrip(code);
    }
    return ts.createPrinter({ removeComments: true }).printFile(sourceFile);
  } catch {
    return naiveStrip(code);
  }
}

function naiveStrip(code: string): string {
  return code
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/**
 * Removes comments from any learner file based on its extension.
 */
export function stripComments(code: string, fileName: string): string {
  return /\.(ts|tsx|js|jsx)$/.test(fileName) ? stripScriptComments(code, fileName) : naiveStrip(code);
}
