import clsx from 'clsx';
import type { Lesson } from '@/content';
import { InlineMarkdown, Markdown } from '@/shared/ui/Markdown';
import { progress, useProgress } from '@/entities/progress';
import { SUCCESS_BADGE_CLASS, buttonClass } from '@/shared/ui/classNames';

const OPTION_STATUS_CLASS: Record<string, string> = {
  '': 'border-line-strong bg-void hover:border-accent',
  correct: 'border-success bg-success/12',
  wrong: 'border-danger bg-danger/10',
  dimmed: 'border-line-strong bg-void opacity-50',
};

/**
 * Multiple choice quiz with instant feedback. Marks the quiz complete when every answer is correct.
 */
export function Quiz({ lesson }: { lesson: Lesson }) {
  const state = useProgress();
  const answers = state.quizAnswers[lesson.key] ?? {};
  const correctCount = lesson.quiz.filter((question, index) => answers[index] === question.answer).length;
  const answeredCount = Object.keys(answers).length;
  const done = Boolean(state.quizzes[lesson.key]);

  const choose = (questionIndex: number, optionIndex: number) => {
    if (answers[questionIndex] !== undefined) {
      return;
    }
    progress.answerQuiz(lesson.key, questionIndex, optionIndex);
    const next = { ...answers, [questionIndex]: optionIndex };
    if (lesson.quiz.every((question, index) => next[index] === question.answer)) {
      progress.markQuiz(lesson.key);
    }
  };

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <span>
          {correctCount}/{lesson.quiz.length} correct
        </span>
        {done && <span className={SUCCESS_BADGE_CLASS}>Quiz complete</span>}
        {answeredCount === lesson.quiz.length && correctCount < lesson.quiz.length && (
          <button className={buttonClass('ghost')} onClick={() => progress.resetQuiz(lesson.key)}>
            Try again
          </button>
        )}
      </div>
      {lesson.quiz.map((question, questionIndex) => {
        const chosen = answers[questionIndex];
        const answered = chosen !== undefined;
        const correct = chosen === question.answer;
        return (
          <section className="rounded-xl border border-line bg-elevated p-4" key={questionIndex}>
            <div className="flex gap-3 [&_.markdown_p:last-child]:mb-2">
              <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-hover text-xs font-bold">{questionIndex + 1}</span>
              <Markdown source={question.question} />
            </div>
            <div className="flex flex-col gap-1.5">
              {question.options.map((option, optionIndex) => {
                const status = !answered ? '' : optionIndex === question.answer ? 'correct' : optionIndex === chosen ? 'wrong' : 'dimmed';
                return (
                  <button
                    key={optionIndex}
                    className={clsx('flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.25 text-left text-sm disabled:cursor-default', OPTION_STATUS_CLASS[status])}
                    disabled={answered}
                    onClick={() => choose(questionIndex, optionIndex)}
                  >
                    <span className="pt-0.5 font-mono text-xs font-semibold text-ink-faint">{String.fromCharCode(65 + optionIndex)}</span>
                    <InlineMarkdown source={option} />
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className="mt-2.5 rounded-lg bg-void px-3 py-2.5 text-sm text-ink-muted">
                <strong className={correct ? 'text-success' : 'text-danger'}>{correct ? 'Correct.' : 'Not quite.'}</strong> <InlineMarkdown source={question.explanation} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
