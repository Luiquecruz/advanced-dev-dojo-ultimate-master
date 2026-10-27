import clsx from 'clsx';
import { useState } from 'react';
import type { Lesson, Track } from '@/content';
import { InlineMarkdown, Markdown } from '@/shared/ui/Markdown';
import { TestName } from './TestName';
import { Quiz } from './Quiz';
import { isLessonComplete, useProgress } from '@/entities/progress';
import type { Report } from './runner';
import { BulbIcon, CheckIcon, CircleIcon, CrossIcon, KeyIcon, MapIcon } from '@/shared/ui/icons';
import { hrefTo } from '@/shared/routing/route';
import { COMPILE_ERROR_CLASS, SECTION_TITLE_CLASS, TEST_MESSAGE_CLASS, buttonClass, tagClass } from '@/shared/ui/classNames';

export type LessonTab = 'learn' | 'challenge' | 'quiz';

interface LessonPanelProps {
  track: Track;
  lesson: Lesson;
  tab: LessonTab;
  onTabChange(tab: LessonTab): void;
  testNames: string[];
  report: Report | null;
  running: boolean;
  onRevealSolution(): void;
  nextLesson?: Lesson;
}

type TestStatus = 'running' | 'pending' | 'passed' | 'failed';

const LEVEL_LABEL: Record<Lesson['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

const TEST_ITEM_CLASS: Record<TestStatus, string> = {
  running: 'border-line [&_.test-icon]:animate-pulse-soft [&_.test-icon]:text-accent',
  pending: 'border-line [&_.test-icon]:text-ink-faint',
  passed: 'border-success/35 [&_.test-icon]:text-success',
  failed: 'border-danger/35 [&_.test-icon]:text-danger',
};

/**
 * Left side of the lesson: theory, challenge description with tests and progressive help, quiz.
 */
export function LessonPanel({ track, lesson, tab, onTabChange, testNames, report, running, onRevealSolution, nextLesson }: LessonPanelProps) {
  const state = useProgress();
  const complete = isLessonComplete(state, lesson);
  const module = track.modules.find((entry) => entry.id === lesson.moduleId)!;

  const tabs: Array<{ id: LessonTab; label: string; done?: boolean }> = [
    { id: 'learn', label: 'Learn' },
    ...(lesson.challenge ? [{ id: 'challenge' as const, label: 'Challenge', done: Boolean(state.challenges[lesson.key]) }] : []),
    ...(lesson.quiz.length > 0 ? [{ id: 'quiz' as const, label: `Quiz · ${lesson.quiz.length}`, done: Boolean(state.quizzes[lesson.key]) }] : []),
  ];

  return (
    <div className="flex h-full flex-col bg-panel">
      <header className="enter px-6.5 pt-5.5 pb-3.5 max-wide:px-4 max-wide:pt-4 max-wide:pb-2.5" style={{ ['--enter-delay' as string]: '280ms' }}>
        <div className="text-xs font-semibold tracking-[0.06em] text-accent uppercase">
          {module.title} · {LEVEL_LABEL[lesson.level]}
        </div>
        <h1 className="mt-1.5 mb-1 text-[26px]/[1.2] font-bold tracking-[-0.02em] outline-none" tabIndex={-1} data-activity-title>
          {lesson.title}
        </h1>
        <p className="m-0 text-ink-muted">{lesson.summary}</p>
        {lesson.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {lesson.tags.map((tag) => (
              <span key={tag} className={tagClass(tag)}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <nav className="flex gap-1 border-b border-line px-5 max-wide:px-2.5" role="tablist">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            aria-selected={tab === entry.id}
            className={clsx(
              '-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-3 py-2.5 text-sm font-semibold hover:text-ink',
              tab === entry.id ? 'border-accent text-ink' : 'border-transparent text-ink-muted',
            )}
            onClick={() => onTabChange(entry.id)}
          >
            {entry.label}
            {entry.done && <CheckIcon className="size-3.5 text-success" role="img" aria-label="Done" />}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto px-6.5 pt-4.5 pb-10 max-wide:px-4 max-wide:pt-3.5 max-wide:pb-8">
        <div key={tab} className="enter" style={{ ['--enter-delay' as string]: '60ms' }}>
          {tab === 'learn' && <LearnTab lesson={lesson} onStart={() => onTabChange(lesson.challenge ? 'challenge' : 'quiz')} />}
          {tab === 'challenge' && lesson.challenge && (
            <ChallengeTab lesson={lesson} testNames={testNames} report={report} running={running} onRevealSolution={onRevealSolution} />
          )}
          {tab === 'quiz' && <Quiz lesson={lesson} />}
        </div>

        {complete && (
          <div className="mt-7 flex items-center gap-3.5 rounded-[10px] border border-success/35 bg-success/12 px-4 py-3.5 text-sm">
            <CheckIcon className="flex-none text-success" />
            <div className="flex-1">
              <strong>Lesson complete.</strong>
              {nextLesson ? <span> Up next: {nextLesson.title}</span> : <span> You finished the {track.title} track.</span>}
            </div>
            {nextLesson && (
              <a className={buttonClass('primary')} href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: nextLesson.id })}>
                Next lesson
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LearnTab({ lesson, onStart }: { lesson: Lesson; onStart(): void }) {
  return (
    <>
      <Markdown source={lesson.theory} />
      {lesson.concepts.length > 0 && (
        <section>
          <h2 className={SECTION_TITLE_CLASS}>Key concepts</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
            {lesson.concepts.map((concept) => (
              <div className="flex flex-col gap-1 rounded-[10px] border border-line bg-elevated px-3.5 py-3 text-[13.5px] text-ink-muted" key={concept.term}>
                <strong className="text-sm text-ink">{concept.term}</strong>
                <InlineMarkdown source={concept.description} />
              </div>
            ))}
          </div>
        </section>
      )}
      {lesson.resources.length > 0 && (
        <section>
          <h2 className={SECTION_TITLE_CLASS}>Further reading</h2>
          <ul className="m-0 list-disc pl-4.5">
            {lesson.resources.map((resource) => (
              <li key={resource.url}>
                <a className="text-accent underline underline-offset-3" href={resource.url} target="_blank" rel="noreferrer">
                  {resource.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(lesson.challenge || lesson.quiz.length > 0) && (
        <button className={buttonClass('primary', 'regular', 'mt-6.5')} onClick={onStart}>
          {lesson.challenge ? 'Start the challenge' : 'Take the quiz'}
        </button>
      )}
    </>
  );
}

function ChallengeTab({ lesson, testNames, report, running, onRevealSolution }: Omit<LessonPanelProps, 'track' | 'tab' | 'onTabChange' | 'nextLesson'>) {
  const challenge = lesson.challenge!;
  const [hintsShown, setHintsShown] = useState(0);
  const [approachShown, setApproachShown] = useState(false);
  const outcomes = new Map(report?.tests.map((test) => [test.name, test]));

  return (
    <>
      <Markdown source={challenge.instructions} />

      <section>
        <h2 className={SECTION_TITLE_CLASS}>Tests</h2>
        {report?.compileError && <pre className={COMPILE_ERROR_CLASS}>{report.compileError}</pre>}
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {testNames.map((name, index) => {
            const outcome = outcomes.get(name) ?? report?.tests[index];
            const status: TestStatus = running ? 'running' : !outcome ? 'pending' : outcome.passed ? 'passed' : 'failed';
            return (
              <li key={`${index}-${name}`} className={clsx('flex items-start gap-2.5 rounded-lg border bg-elevated px-3 py-2.25 text-sm', TEST_ITEM_CLASS[status])}>
                <span className="test-icon grid pt-0.75">
                  {status === 'passed' ? <CheckIcon role="img" aria-label="Passed" /> : status === 'failed' ? <CrossIcon role="img" aria-label="Failed" /> : <CircleIcon role="img" aria-label={status === 'running' ? 'Running' : 'Not run'} />}
                </span>
                <div className="min-w-0 flex-1">
                  <TestName name={name} />
                  {status === 'failed' && outcome?.message && <pre className={TEST_MESSAGE_CLASS}>{outcome.message}</pre>}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 text-xs text-ink-faint">
          Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> in the editor to run the tests.
        </p>
      </section>

      <section>
        <h2 className={SECTION_TITLE_CLASS}>Stuck?</h2>
        {challenge.hints.slice(0, hintsShown).map((hint, index) => (
          <div className="mb-2.5 rounded-[10px] border border-warning/25 bg-warning/12 px-4 pt-3 pb-0.5" key={index}>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-[0.05em] text-warning uppercase">
              <BulbIcon /> Hint {index + 1}
            </div>
            <Markdown source={hint} />
          </div>
        ))}
        {approachShown && (
          <div className="mb-2.5 rounded-[10px] border border-accent/25 bg-accent/8 px-4 pt-3 pb-0.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-[0.05em] text-accent uppercase">
              <MapIcon /> Solution path
            </div>
            <Markdown source={challenge.approach} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {hintsShown < challenge.hints.length && (
            <button className={buttonClass('ghost')} onClick={() => setHintsShown(hintsShown + 1)}>
              <BulbIcon /> {hintsShown === 0 ? 'Show a hint' : `Show hint ${hintsShown + 1} of ${challenge.hints.length}`}
            </button>
          )}
          {!approachShown && challenge.approach && (
            <button className={buttonClass('ghost')} onClick={() => setApproachShown(true)}>
              <MapIcon /> Show the solution path
            </button>
          )}
          <button className={buttonClass('warning')} onClick={onRevealSolution}>
            <KeyIcon /> Reveal solution
          </button>
        </div>
      </section>
    </>
  );
}
