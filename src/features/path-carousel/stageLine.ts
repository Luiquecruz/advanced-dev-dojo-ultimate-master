import type { TrackSummary } from '@/entities/progress';
import { moduleNumberLabel } from '@/entities/track';

/**
 * Stage line of a mission card: the completed mission, the optional stage the resume waypoint sits in, or the required stage out of the last stage number.
 */
export function stageLine(summary: TrackSummary): string {
  if (summary.status === 'completed') {
    return `All ${summary.lastStageNumber} stages done`;
  }
  const module = summary.modules[summary.currentModuleIndex].module;
  if (module.optional) {
    return `Optional stage ${moduleNumberLabel(module)} · ${module.title}`;
  }
  return `Stage ${module.number} of ${summary.lastStageNumber} · ${module.title}`;
}
