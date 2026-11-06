import type { ProgressState } from './progressStore';

/**
 * The public State Management track keeps its react-state lesson keys when React exercises gain a variant.
 * Move their former unqualified drafts into the React namespace, retaining newer variant-specific drafts.
 */
export function migrateStateManagementProgress(state: ProgressState): ProgressState {
  const code = { ...state.code };
  const challengeLanguages = { ...state.challengeLanguages };
  for (const [key, files] of Object.entries(code)) {
    if (key.startsWith('react-state/') && !key.includes('#')) {
      const nextKey = `${key}#react`;
      code[nextKey] ??= files;
      delete code[key];
    }
  }
  for (const key of Object.keys(state.challenges)) {
    const passed = challengeLanguages[key];
    if (key.startsWith('react-state/') && !passed?.react && !passed?.angular) {
      challengeLanguages[key] = { ...passed, react: true };
    }
  }
  return { ...state, code, challengeLanguages };
}
