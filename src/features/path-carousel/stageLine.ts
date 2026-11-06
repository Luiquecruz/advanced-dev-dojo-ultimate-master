import type { TrackSummary } from '@/entities/progress';
import { moduleNumberLabel } from '@/entities/track';

/**
 * Stage line of a track card: the completed track, the optional module the resume lesson sits in, or the required stage out of the last stage number.
 */
export function stageLine(summary: TrackSummary): string {
  if (summary.status === 'completed') {
    return `All ${summary.lastStageNumber} stages done`;
  }
  const module = summary.modules[summary.currentModuleIndex].module;
  if (module.optional) {
    return `Optional module ${moduleNumberLabel(module)} · ${module.title}`;
  }
  return `Stage ${module.number} of ${summary.lastStageNumber} · ${module.title}`;
}
