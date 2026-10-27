import type { ReactNode } from 'react';
import { GlowBorder } from '@/shared/ui/GlowBorder';

/**
 * Frosted curriculum container with the luminous perimeter. Semi-opaque with noise instead of a large backdrop blur.
 */
export function CurriculumPanel({ label, paused = false, children }: { label: string; paused?: boolean; children: ReactNode }) {
  return (
    <section aria-label={label} className="relative rounded-panel bg-frost p-7 max-wide:p-4.5">
      <GlowBorder paused={paused} />
      <div className="relative">{children}</div>
    </section>
  );
}
