import { createModel } from '@dojo/ai';
import { fakeModel, respond } from '@dojo/ai/testing';
import { createMemoryStore, extractCandidates } from './main';

const HOUR = 3_600_000;

const SESSIONS = [
  {
    hoursLater: 0,
    transcript: 'user: Book me a flight to Lisbon. I always take aisle seats, and I am allergic to peanuts.',
    reply: respond.json({
      memories: [
        { text: 'The user always takes aisle seats on flights', importance: 5 },
        { text: 'The user is allergic to peanuts', importance: 9 },
        { text: 'The user said hello', importance: 1 },
      ],
    }),
  },
  {
    hoursLater: 26,
    transcript: 'user: Find a vegan restaurant near the hotel for tonight.',
    reply: respond.malformedJson({ memories: [{ text: 'The user prefers vegan restaurants', importance: 6 }] }),
  },
  {
    hoursLater: 80,
    transcript: 'user: Aisle seat again please. And I prefer vegan restaurants when we travel.',
    reply: respond.json({
      memories: [
        { text: 'The user always takes aisle seats on flights', importance: 6 },
        { text: 'The user prefers vegan restaurants when traveling', importance: 6 },
      ],
    }),
  },
];

async function main() {
  let time = Date.UTC(2026, 9, 1, 9, 0, 0);
  const memory = createMemoryStore({ now: () => time, decayPerHour: 0.99 });
  const model = createModel();
  let elapsed = 0;

  for (const session of SESSIONS) {
    time += (session.hoursLater - elapsed) * HOUR;
    elapsed = session.hoursLater;
    fakeModel.reply(session.reply);
    const candidates = await extractCandidates(model, session.transcript);
    console.log(`hour ${String(session.hoursLater).padStart(3)}: ${candidates.length === 0 ? 'no usable candidates (malformed or refused), nothing stored' : `${candidates.length} candidates`}`);
    for (const candidate of candidates) {
      const result = memory.write(candidate);
      console.log(`  ${result.action.padEnd(7)} ${candidate.text} (importance ${candidate.importance})`);
    }
  }

  time += 48 * HOUR;
  const query = 'Book a restaurant for Friday dinner in Porto';
  console.log(`\nStored memories: ${memory.all().length}. Query two days later: "${query}"`);
  console.log('score  relevance  recency  importance  memory');
  for (const result of memory.retrieve(query, 3)) {
    const columns = [result.score, result.relevance, result.recency, result.importance].map((value) => value.toFixed(2).padStart(5));
    console.log(`${columns[0]}  ${columns[1]}      ${columns[2]}    ${columns[3]}       ${result.memory.text}`);
  }
}

main().catch((error) => console.error(`demo failed: ${error.message}`));
