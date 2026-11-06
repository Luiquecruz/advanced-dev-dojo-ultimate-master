import type { LanguageRegistry } from './types.ts';

/**
 * Languages and frameworks a track can offer, each graded by one engine.
 */
export const LANGUAGES: LanguageRegistry = {
  react: { label: 'React', engine: 'react' },
  angular: { label: 'Angular', engine: 'angular' },
  node: { label: 'Node.js', engine: 'node' },
  python: { label: 'Python', engine: 'python' },
  csharp: { label: 'C#', engine: 'csharp' },
};
