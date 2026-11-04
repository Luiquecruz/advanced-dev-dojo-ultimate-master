import type { LanguageRegistry } from './types.ts';

/**
 * Languages a multi-language track can offer, each graded by one engine.
 */
export const LANGUAGES: LanguageRegistry = {
  node: { label: 'Node.js', engine: 'node' },
};
