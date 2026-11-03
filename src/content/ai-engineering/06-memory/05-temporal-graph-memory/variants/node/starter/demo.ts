import { cosineSimilarity, embed } from '@dojo/ai';
import { createTemporalMemory } from './main';
import type { FactInput } from './main';

const DAY = 86_400_000;
const START = Date.UTC(2026, 0, 1);
const day = (offset: number) => START + offset * DAY;
const date = (time: number) => new Date(time).toISOString().slice(0, 10);

const EPISODES: Array<{ learnedOn: number; sentence: string; fact: FactInput }> = [
  { learnedOn: 2, sentence: 'Ana works at Acme.', fact: { subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(0) } },
  { learnedOn: 5, sentence: 'Ana lives in Lisbon.', fact: { subject: 'ana', predicate: 'lives_in', object: 'Lisbon', validFrom: day(0) } },
  { learnedOn: 68, sentence: 'Ana works at Globex since March 1.', fact: { subject: 'ana', predicate: 'works_at', object: 'Globex', validFrom: day(59) } },
  { learnedOn: 70, sentence: 'Ana likes jazz.', fact: { subject: 'ana', predicate: 'likes', object: 'jazz', validFrom: day(70) } },
  { learnedOn: 75, sentence: 'Ana works at Acme.', fact: { subject: 'ana', predicate: 'works_at', object: 'Acme', validFrom: day(0) } },
];

function flatAnswer(sentences: string[], question: string): string {
  const query = embed(question);
  const ranked = sentences.map((sentence) => ({ sentence, score: cosineSimilarity(query, embed(sentence)) })).sort((left, right) => right.score - left.score);
  return ranked.slice(0, 2).map((entry) => `"${entry.sentence}" (${entry.score.toFixed(2)})`).join(', ');
}

function main() {
  let time = day(0);
  const graph = createTemporalMemory({ now: () => time, exclusivePredicates: ['works_at', 'lives_in'] });
  const sentences: string[] = [];

  for (const episode of EPISODES) {
    time = day(episode.learnedOn);
    sentences.push(episode.sentence);
    const fact = graph.add(episode.fact);
    console.log(`${date(time)} learned "${episode.sentence}" -> ${fact.object} valid from ${date(fact.validFrom)}${fact.validTo === null ? '' : ` to ${date(fact.validTo)}`}`);
  }

  time = day(90);
  const question = 'Where does Ana work?';
  console.log(`\nFlat vector memory, top 2 for "${question}": ${flatAnswer(sentences, question)}`);
  console.log(`Temporal graph, current: ${graph.current('ana', 'works_at').map((fact) => fact.object).join(', ')}`);
  console.log(`Temporal graph, true on ${date(day(45))}: ${graph.asOf('ana', 'works_at', day(45)).map((fact) => fact.object).join(', ')}`);
  console.log(`Temporal graph, believed on ${date(day(64))} about ${date(day(64))}: ${graph.asOf('ana', 'works_at', day(64), day(64)).map((fact) => fact.object).join(', ')}`);

  console.log('\nEvery record, nothing deleted:');
  for (const fact of graph.all()) {
    const valid = `${date(fact.validFrom)} .. ${fact.validTo === null ? 'now' : date(fact.validTo)}`;
    const known = `${date(fact.recordedAt)} .. ${fact.expiredAt === null ? 'now' : date(fact.expiredAt)}`;
    console.log(`  ${fact.predicate.padEnd(8)} ${fact.object.padEnd(7)} valid ${valid}   known ${known}`);
  }
}

main();
