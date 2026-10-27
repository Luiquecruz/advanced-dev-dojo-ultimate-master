import { useEffect, useRef } from 'react';
import { tracks } from '../content';
import { PathCard } from '../ui/PathCard';
import { PathGrid } from '../ui/PathGrid';
import { progress } from './progress';
import { buttonClass } from './ui';

const EXPLORE_THRESHOLD = 0.35;

/**
 * Landing page: intro hero followed by the track grid.
 */
export function Home({ onExploreChange }: { onExploreChange(exploring: boolean): void }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const totalLessons = tracks.reduce((sum, track) => sum + track.lessons.length, 0);
  const totalChallenges = tracks.reduce((sum, track) => sum + track.lessons.filter((lesson) => lesson.challenge).length, 0);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => onExploreChange(entry.isIntersecting), { threshold: EXPLORE_THRESHOLD });
    observer.observe(gridRef.current!);
    return () => {
      observer.disconnect();
      onExploreChange(false);
    };
  }, [onExploreChange]);

  return (
    <main className="mx-auto max-w-295 px-6 pt-12 pb-16 max-wide:px-4 max-wide:pt-8 max-wide:pb-12">
      <header>
        <div className="inline-flex items-center gap-3 text-xl font-extrabold tracking-[-0.02em]">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={40} height={40} />
          <span>Dev Dojo</span>
        </div>
        <h1 className="mt-7 mb-4 max-w-205 text-[clamp(32px,5vw,52px)]/[1.08] font-bold tracking-[-0.035em]">Learn modern front-end by writing real code.</h1>
        <p className="m-0 max-w-190 text-lg text-ink-muted">
          Theory, hands-on challenges validated by tests, progressive hints and quizzes for TypeScript, React, Vue and Angular, from the fundamentals to the newest APIs, including the legacy patterns you still meet at work.
        </p>
        <div className="mt-7 flex flex-wrap gap-7 text-ink-muted">
          <span>
            <strong className="mr-1.5 text-[22px] text-ink">{tracks.length}</strong> tracks
          </span>
          <span>
            <strong className="mr-1.5 text-[22px] text-ink">{totalLessons}</strong> lessons
          </span>
          <span>
            <strong className="mr-1.5 text-[22px] text-ink">{totalChallenges}</strong> coding challenges
          </span>
        </div>
      </header>

      <div ref={gridRef} className="mt-11">
        <PathGrid>
          {tracks.map((track) => (
            <PathCard key={track.id} track={track} />
          ))}
        </PathGrid>
      </div>

      <section className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5 border-t border-line pt-8">
        <div>
          <h3 className="mb-1.5 text-base font-semibold">1. Learn</h3>
          <p className="m-0 text-sm text-ink-muted">Each lesson starts with focused theory, examples, key concepts and links to the official docs.</p>
        </div>
        <div>
          <h3 className="mb-1.5 text-base font-semibold">2. Practice</h3>
          <p className="m-0 text-sm text-ink-muted">Write code in a real editor next to the task. A live preview and automated tests validate your solution.</p>
        </div>
        <div>
          <h3 className="mb-1.5 text-base font-semibold">3. Get unstuck</h3>
          <p className="m-0 text-sm text-ink-muted">Reveal hints one at a time, then the solution path, and only then the reference solution.</p>
        </div>
      </section>

      <footer className="mt-12 flex items-center justify-between gap-4 text-[13px] text-ink-faint">
        <span>Progress is saved in this browser.</span>
        <button className={buttonClass('ghost', 'small')} onClick={() => confirm('Erase all progress and saved code?') && progress.resetAll()}>
          Reset progress
        </button>
      </footer>
    </main>
  );
}
