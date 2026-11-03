import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { answerWithCitations, buildContext } from './main';
import type { GroundedAnswer } from './main';
import { RETRIEVED } from './passages';

const model = createModel();

function show(label: string, result: GroundedAnswer) {
  console.log(`\n${label}: ${result.status} after ${result.attempts} model call(s)`);
  if (result.answer !== null) {
    console.log(`  answer: ${result.answer}`);
  }
  for (const citation of result.citations) {
    console.log(`  [${citation.number}] ${citation.id} (${citation.source})`);
  }
}

async function main() {
  const question = 'When will my annual plan refund reach my card?';
  const { context } = buildContext(RETRIEVED);
  console.log(`Context sent to the model:\n${context}`);

  fakeModel.reply(respond.text('Annual plans are refundable within 30 days [2], and refunds reach the original card within 5 to 10 business days [1].'));
  show('Grounded answer', await answerWithCitations(model, question, RETRIEVED));

  fakeModel.reply(respond.text('Refunds take 5 to 10 business days [1] and are always paid in cash [5].'), respond.text('Refunds reach the original card within 5 to 10 business days [1].'));
  show('Invented citation, repaired on the second call', await answerWithCitations(model, question, RETRIEVED));

  fakeModel.reply(respond.text('Probably about a week.'), respond.text('I think it is about a week.'));
  show('No citations twice, answer withheld', await answerWithCitations(model, question, RETRIEVED));

  show('Off-topic question, nothing above the threshold', await answerWithCitations(model, 'Who won the 1998 World Cup?', RETRIEVED.map((passage) => ({ ...passage, score: 0.05 }))));
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
