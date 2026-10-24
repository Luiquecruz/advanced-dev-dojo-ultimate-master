import ts from 'typescript';
import { createStaticAnalyzer, type StaticAnalysisRequest } from './staticAnalysis';

const libraryModules = import.meta.glob(
  ['/node_modules/typescript/lib/lib.*.d.ts', '!/node_modules/typescript/lib/lib.dom*', '!/node_modules/typescript/lib/lib.webworker*', '!/node_modules/typescript/lib/lib.scripthost*'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const libraries = Object.fromEntries(Object.entries(libraryModules).map(([path, text]) => [path.slice(path.lastIndexOf('/') + 1), text]));

const analyzer = createStaticAnalyzer(ts, libraries);

self.onmessage = (event: MessageEvent<{ requestId: number; request: StaticAnalysisRequest }>) => {
  const { requestId, request } = event.data;
  try {
    self.postMessage({ requestId, analysis: analyzer.analyze(request) });
  } catch (error) {
    self.postMessage({ requestId, error: error instanceof Error ? error.message : String(error) });
  }
};
