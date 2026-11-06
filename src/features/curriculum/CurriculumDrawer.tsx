import { useCallback, useEffect, useRef } from 'react';
import type { Track } from '@/content';
import { summarizeTrack, useProgress } from '@/entities/progress';
import { TrackLogo } from '@/entities/track';
import { ModuleList } from './ModuleList';
import { CrossIcon } from '@/shared/ui/icons';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { iconButtonClass } from '@/shared/ui/classNames';

const DRAWER_SLIDE_MS = 160;

/**
 * Slide-in star map of the current mission: its progress and every stage with its waypoints. Closing it with Escape, the close
 * button or the backdrop returns focus to the element that opened it; following a waypoint leaves focus to the new screen.
 */
export function CurriculumDrawer({ track, currentKey, onClose }: { track: Track; currentKey: string; onClose(): void }) {
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(false);
  const { done, total, percent } = summarizeTrack(track, useProgress());
  const close = useCallback(() => {
    restoreFocusRef.current = true;
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    const panel = panelRef.current!;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !panel.contains(active)) {
      openerRef.current = active;
    }
    panel.querySelector('[data-current]')?.scrollIntoView({ block: 'center' });
    panel.focus({ preventScroll: true });
    return () => {
      const opener = openerRef.current;
      if (restoreFocusRef.current && opener?.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <div role="presentation" className="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && close()}>
      <aside
        ref={panelRef}
        data-trail={track.id}
        role="dialog"
        aria-modal="true"
        aria-label={`${track.title} star map`}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[min(420px,100vw)] animate-slide-in flex-col border-r border-line-strong bg-panel shadow-drawer outline-none"
      >
        <header className="flex-none border-b border-line bg-elevated px-4 pt-3.5 pb-4">
          <div className="flex items-center gap-3">
            <TrackLogo track={track} size={32} animate delayMs={DRAWER_SLIDE_MS} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10.5px] font-semibold tracking-[0.16em] text-accent uppercase">Star map</div>
              <h2 className="m-0 truncate text-base/tight font-semibold">{track.title}</h2>
            </div>
            <button className={iconButtonClass()} onClick={close} title="Close">
              <CrossIcon />
            </button>
          </div>
          <div className="mt-3.5 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar percent={percent} label={`${done} of ${total} waypoints reached`} />
            </div>
            <span className="flex-none font-mono text-[11px] text-ink-faint">
              {done}/{total}
            </span>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ModuleList track={track} currentKey={currentKey} onNavigate={onClose} compact />
        </div>
      </aside>
    </div>
  );
}
