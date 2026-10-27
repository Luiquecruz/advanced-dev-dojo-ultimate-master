import { useEffect, useState, type ReactNode, type RefObject } from 'react';

interface ActivityShellProps {
  surfaceRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  inactive: boolean;
  children: ReactNode;
}

/**
 * Full-screen layer of the activity. The surface is the element the FLIP transition scales; the content sits beside it
 * so it is never scaled, only faded. The content mounts two frames after the shell, so the transition is already running
 * on the compositor while the heavy activity (editor, preview) mounts.
 */
export function ActivityShell({ surfaceRef, contentRef, inactive, children }: ActivityShellProps) {
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setContentReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="fixed inset-0 z-40 overscroll-contain" inert={inactive}>
      <div ref={surfaceRef} className="absolute inset-0 origin-top-left bg-panel will-change-transform" />
      <div ref={contentRef} className="absolute inset-0">
        {contentReady && children}
      </div>
    </div>
  );
}
