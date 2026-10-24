import { useState } from 'react';
import type { Lesson, Track } from '../content';
import { InlineMarkdown, Markdown } from './Markdown';
import { TestName } from './TestName';
import { Quiz } from './Quiz';
import { isLessonComplete, useProgress } from './progress';
import type { Report } from './runner';
import { BulbIcon, CheckIcon, CircleIcon, CrossIcon, KeyIcon, MapIcon } from './icons';
import { hrefTo } from './route';

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

const LEVEL_LABEL: Record<Lesson['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
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
    <div className="lesson-panel">
      <header className="lesson-header">
        <div className="lesson-eyebrow">
          {module.title} · {LEVEL_LABEL[lesson.level]}
        </div>
        <h1>{lesson.title}</h1>
        <p className="lesson-summary">{lesson.summary}</p>
        {lesson.tags.length > 0 && (
          <div className="tag-row">
            {lesson.tags.map((tag) => (
              <span key={tag} className={`tag tag-${tag}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <nav className="tabs" role="tablist">
        {tabs.map((entry) => (
          <button key={entry.id} role="tab" aria-selected={tab === entry.id} className={`tab ${tab === entry.id ? 'active' : ''}`} onClick={() => onTabChange(entry.id)}>
            {entry.label}
            {entry.done && <CheckIcon className="tab-check" />}
          </button>
        ))}
      </nav>

      <div className="lesson-scroll">
        {tab === 'learn' && <LearnTab lesson={lesson} onStart={() => onTabChange(lesson.challenge ? 'challenge' : 'quiz')} />}
        {tab === 'challenge' && lesson.challenge && (
          <ChallengeTab lesson={lesson} testNames={testNames} report={report} running={running} onRevealSolution={onRevealSolution} />
        )}
        {tab === 'quiz' && <Quiz lesson={lesson} />}

        {complete && (
          <div className="completion-banner">
            <CheckIcon />
            <div>
              <strong>Lesson complete.</strong>
              {nextLesson ? <span> Up next: {nextLesson.title}</span> : <span> You finished the {track.title} track.</span>}
            </div>
            {nextLesson && (
              <a className="button button-primary" href={hrefTo({ page: 'lesson', trackId: track.id, lessonId: nextLesson.id })}>
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
        <section className="concepts">
          <h2>Key concepts</h2>
          <div className="concept-grid">
            {lesson.concepts.map((concept) => (
              <div className="concept-card" key={concept.term}>
                <strong>{concept.term}</strong>
                <InlineMarkdown source={concept.description} />
              </div>
            ))}
          </div>
        </section>
      )}
      {lesson.resources.length > 0 && (
        <section className="resources">
          <h2>Further reading</h2>
          <ul>
            {lesson.resources.map((resource) => (
              <li key={resource.url}>
                <a href={resource.url} target="_blank" rel="noreferrer">
                  {resource.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(lesson.challenge || lesson.quiz.length > 0) && (
        <button className="button button-primary start-button" onClick={onStart}>
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

      <section className="test-list">
        <h2>Tests</h2>
        {report?.compileError && <pre className="compile-error">{report.compileError}</pre>}
        <ul>
          {testNames.map((name, index) => {
            const outcome = outcomes.get(name) ?? report?.tests[index];
            const status = running ? 'running' : !outcome ? 'pending' : outcome.passed ? 'passed' : 'failed';
            return (
              <li key={`${index}-${name}`} className={`test-item ${status}`}>
                <span className="test-icon">{status === 'passed' ? <CheckIcon /> : status === 'failed' ? <CrossIcon /> : <CircleIcon />}</span>
                <div>
                  <TestName name={name} />
                  {status === 'failed' && outcome?.message && <pre className="test-message">{outcome.message}</pre>}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="test-hint">
          Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> in the editor to run the tests.
        </p>
      </section>

      <section className="help">
        <h2>Stuck?</h2>
        {challenge.hints.slice(0, hintsShown).map((hint, index) => (
          <div className="hint-card" key={index}>
            <div className="hint-label">
              <BulbIcon /> Hint {index + 1}
            </div>
            <Markdown source={hint} />
          </div>
        ))}
        {approachShown && (
          <div className="hint-card approach">
            <div className="hint-label">
              <MapIcon /> Solution path
            </div>
            <Markdown source={challenge.approach} />
          </div>
        )}
        <div className="help-actions">
          {hintsShown < challenge.hints.length && (
            <button className="button button-ghost" onClick={() => setHintsShown(hintsShown + 1)}>
              <BulbIcon /> {hintsShown === 0 ? 'Show a hint' : `Show hint ${hintsShown + 1} of ${challenge.hints.length}`}
            </button>
          )}
          {!approachShown && challenge.approach && (
            <button className="button button-ghost" onClick={() => setApproachShown(true)}>
              <MapIcon /> Show the solution path
            </button>
          )}
          <button className="button button-ghost danger" onClick={onRevealSolution}>
            <KeyIcon /> Reveal solution
          </button>
        </div>
      </section>
    </>
  );
}
