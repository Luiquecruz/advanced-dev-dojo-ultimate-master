import { useEffect } from 'react';
import type { Track } from '@/content';
import { ModuleList } from './ModuleList';
import { CrossIcon } from '@/shared/ui/icons';
import { TrackLogo } from '@/entities/track';
import { iconButtonClass } from '@/shared/ui/classNames';

/**
 * Slide-in curriculum of the current track.
 */
export function CurriculumDrawer({ track, currentKey, onClose }: { track: Track; currentKey: string; onClose(): void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.querySelector('[data-current]')?.scrollIntoView({ block: 'center' });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[rgb(3_6_12/0.6)] backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="absolute inset-y-0 left-0 flex w-[min(460px,100vw)] animate-slide-in flex-col border-r border-line bg-panel shadow-float"
        onClick={(event) => event.stopPropagation()}
        aria-label={`${track.title} curriculum`}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <TrackLogo track={track} size={28} />
          <h2 className="m-0 flex-1 text-lg font-semibold">{track.title}</h2>
          <button className={iconButtonClass()} onClick={onClose} title="Close">
            <CrossIcon />
          </button>
        </header>
        <ModuleList track={track} currentKey={currentKey} onNavigate={onClose} compact className="overflow-y-auto p-3.5" />
      </aside>
    </div>
  );
}
