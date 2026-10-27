import { useRef, type ReactNode } from 'react';
import { buttonClass } from '../app/ui';
import { useTiltGroup } from './useTiltGroup';

/**
 * Grid of path cards sharing one perspective and one tilt, with the opt-in device motion toggle on touch devices.
 */
export function PathGrid({ children }: { children: ReactNode }) {
  const groupRef = useRef<HTMLDivElement>(null);
  const { gyroSupported, gyroStatus, toggleGyro } = useTiltGroup(groupRef);

  return (
    <div>
      {gyroSupported && gyroStatus !== 'unavailable' && (
        <div className="mb-3 flex items-center justify-end gap-3 text-xs text-ink-faint">
          {gyroStatus === 'denied' ? (
            <span role="status">Motion access was blocked. Drag sideways across the cards instead.</span>
          ) : (
            <button className={buttonClass('ghost', 'small')} onClick={toggleGyro} aria-pressed={gyroStatus === 'active'}>
              {gyroStatus === 'active' ? 'Disable motion' : 'Enable motion'}
            </button>
          )}
        </div>
      )}
      <div ref={groupRef} className="grid touch-pan-y grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4.5 perspective-(--persp)">
        {children}
      </div>
    </div>
  );
}
