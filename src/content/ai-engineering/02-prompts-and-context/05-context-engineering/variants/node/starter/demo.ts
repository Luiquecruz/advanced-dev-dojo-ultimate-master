import { createModel } from '@dojo/ai';
import type { Message } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { answerWithContext, type RetrievedDocument } from './main';

const SYSTEM = 'You are the Parcelly help assistant. Answer only from the documents and say "I do not know" when they do not cover the question.';
const DOCUMENTS: RetrievedDocument[] = [
  { id: 'refunds', score: 0.91, text: 'Refunds for damaged parcels are issued within five business days after the claim is approved. Claims need a photo of the damage. Refunds go back to the original payment method.' },
  { id: 'claims', score: 0.84, text: 'To open a damage claim, go to Orders, choose the parcel and press Report a problem. Claims must be opened within 14 days of delivery.' },
  { id: 'policy', score: 0.72, text: 'The general terms cover every parcel sent with Parcelly. '.repeat(4) + 'Liability for damage is limited to the declared value of the parcel. '.repeat(12) },
  { id: 'shipping', score: 0.4, text: 'Standard shipping takes two to four business days within the EU.' },
  { id: 'careers', score: 0.05, text: 'Parcelly is hiring couriers in Lisbon and Porto.' },
];
const HISTORY: Message[] = [
  { role: 'user', content: 'Hi, my parcel 2210 arrived today.' },
  { role: 'assistant', content: 'Thanks for letting us know. How can I help with parcel 2210?' },
  { role: 'user', content: 'The box was crushed and the vase inside is broken.' },
  { role: 'assistant', content: 'I am sorry to hear that. I can help you with a damage claim.' },
  { role: 'user', content: 'Do I need to keep the box?' },
  { role: 'assistant', content: 'Yes, please keep the box and the packaging until the claim is closed.' },
];

async function main() {
  for (const contextWindow of [32000, 330, 230]) {
    fakeModel.reset().configure({ contextWindow });
    fakeModel.reply(respond.text('Yes. Open a claim within 14 days with a photo; the refund arrives within five business days.'));
    const { text, context } = await answerWithContext(
      createModel(),
      { system: SYSTEM, history: HISTORY, question: 'Can I get a refund for a damaged parcel?', documents: DOCUMENTS, minScore: 0.2, maxDocumentTokens: 60 },
      80,
    );
    console.log(`context window ${contextWindow}, output reserve 80 -> ${context.tokens} input tokens`);
    console.log(`  documents: ${context.includedDocumentIds.join(', ') || 'none'} | dropped: ${context.droppedDocumentIds.join(', ')} | compressed: ${context.compressedDocumentIds.join(', ') || 'none'}`);
    console.log(`  history: ${context.keptTurns} turns kept, ${context.droppedTurns} dropped`);
    console.log(`  answer: ${text}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
