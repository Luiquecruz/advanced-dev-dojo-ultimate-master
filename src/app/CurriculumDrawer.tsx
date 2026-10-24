import { useEffect } from 'react';
import type { Track } from '../content';
import { ModuleList } from './ModuleList';
import { CrossIcon } from './icons';
import { TrackLogo } from './TrackLogo';

/**
 * Slide-in curriculum of the current track.
 */
export function CurriculumDrawer({ track, currentKey, onClose }: { track: Track; currentKey: string; onClose(): void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.querySelector('.lesson-link.current')?.scrollIntoView({ block: 'center' });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()} aria-label={`${track.title} curriculum`}>
        <header>
          <TrackLogo track={track} size={28} />
          <h2>{track.title}</h2>
          <button className="icon-button" onClick={onClose} title="Close">
            <CrossIcon />
          </button>
        </header>
        <ModuleList track={track} currentKey={currentKey} onNavigate={onClose} />
      </aside>
    </div>
  );
}
