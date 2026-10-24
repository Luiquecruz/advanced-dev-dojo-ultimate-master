import type { Lesson } from '../content';
import { InlineMarkdown, Markdown } from './Markdown';
import { progress, useProgress } from './progress';

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
    <div className="quiz">
      <div className="quiz-status">
        <span>
          {correctCount}/{lesson.quiz.length} correct
        </span>
        {done && <span className="badge badge-success">Quiz complete</span>}
        {answeredCount === lesson.quiz.length && correctCount < lesson.quiz.length && (
          <button className="button button-ghost" onClick={() => progress.resetQuiz(lesson.key)}>
            Try again
          </button>
        )}
      </div>
      {lesson.quiz.map((question, questionIndex) => {
        const chosen = answers[questionIndex];
        const answered = chosen !== undefined;
        return (
          <section className="quiz-question" key={questionIndex}>
            <div className="quiz-question-title">
              <span className="quiz-number">{questionIndex + 1}</span>
              <Markdown source={question.question} />
            </div>
            <div className="quiz-options">
              {question.options.map((option, optionIndex) => {
                const isCorrect = optionIndex === question.answer;
                const status = !answered ? '' : isCorrect ? 'correct' : optionIndex === chosen ? 'wrong' : 'dimmed';
                return (
                  <button key={optionIndex} className={`quiz-option ${status}`} disabled={answered} onClick={() => choose(questionIndex, optionIndex)}>
                    <span className="quiz-option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                    <InlineMarkdown source={option} />
                  </button>
                );
              })}
            </div>
            {answered && (
              <div className={`quiz-explanation ${chosen === question.answer ? 'correct' : 'wrong'}`}>
                <strong>{chosen === question.answer ? 'Correct.' : 'Not quite.'}</strong> <InlineMarkdown source={question.explanation} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
