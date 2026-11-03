import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { calibrate, comparePairwise, judgeAnswer } from './main';
import type { Rubric } from './main';

const RUBRIC: Rubric = {
  criteria: [
    { name: 'accuracy', description: 'Every claim matches the refund policy.' },
    { name: 'tone', description: 'Polite, calm and free of blame.' },
  ],
  scale: { min: 1, max: 5 },
};

const QUESTION = 'When do I get my money back?';
const GOOD = 'Refunds reach the original card within 5 business days.';
const VAGUE = 'Refunds usually take a while, please be patient.';

async function main() {
  const judge = createModel({ model: 'judge' });

  console.log('Rubric judgments');
  fakeModel.reply(
    respond.truncated(JSON.stringify({ reasoning: 'Correct timing', scores: { accuracy: 5, tone: 4 } }), 0.5),
    respond.json({ reasoning: 'Correct timing', scores: { accuracy: 5, tone: 4 } }),
    respond.json({ reasoning: 'No timing given', scores: { accuracy: 2, tone: 4 } }),
    respond.text('This answer seems fine to me.'),
    respond.json({ scores: { accuracy: 7, tone: 3 } }),
  );
  for (const answer of [GOOD, VAGUE, 'Refunds are instant and guaranteed.']) {
    const judgment = await judgeAnswer(judge, { rubric: RUBRIC, question: QUESTION, answer });
    const summary = judgment.valid ? `scores ${JSON.stringify(judgment.scores)} overall ${judgment.overall}` : `no usable judgment (${judgment.reason})`;
    console.log(`  "${answer.slice(0, 40)}..." -> ${summary} after ${judgment.attempts} attempt(s)`);
  }

  console.log('\nCalibration against 12 human labels');
  const human = ['pass', 'pass', 'fail', 'pass', 'fail', 'pass', 'pass', 'fail', 'pass', 'pass', 'fail', 'pass'];
  const candidates = {
    'strict judge': ['pass', 'pass', 'fail', 'pass', 'fail', 'pass', 'fail', 'fail', 'pass', 'pass', 'fail', 'pass'],
    'lenient judge': ['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'fail', 'pass', 'pass', 'pass', 'pass'],
  };
  for (const [name, labels] of Object.entries(candidates)) {
    const calibration = calibrate(labels, human, { minKappa: 0.6 });
    console.log(`  ${name.padEnd(13)} agreement ${calibration.agreement.toFixed(2)}  kappa ${calibration.kappa.toFixed(2)}  trusted=${calibration.trusted}  disagrees on cases ${calibration.disagreements.join(', ')}`);
  }

  console.log('\nPairwise comparison, both orders');
  fakeModel.handle(() => respond.json({ reasoning: 'The first answer reads better', winner: 'first' }));
  const biased = await comparePairwise(judge, { question: QUESTION, answerA: VAGUE, answerB: GOOD });
  console.log(`  position-biased judge: votes ${biased.votes.join(' / ')} -> winner ${biased.winner}, consistent=${biased.consistent}`);
  fakeModel.handle((request) => {
    const text = request.messages.map((message) => message.content).join('\n');
    return respond.json({ reasoning: 'Gives the exact timing', winner: text.indexOf(GOOD) < text.indexOf(VAGUE) ? 'first' : 'second' });
  });
  const fair = await comparePairwise(judge, { question: QUESTION, answerA: VAGUE, answerB: GOOD });
  console.log(`  fair judge:            votes ${fair.votes.join(' / ')} -> winner ${fair.winner}, consistent=${fair.consistent}`);
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
