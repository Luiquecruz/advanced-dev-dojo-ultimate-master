import { HANDBOOK } from './handbook';
import { chunkFixed, chunkMarkdown, chunkRecursive } from './main';
import type { Chunk } from './main';

const preview = (text: string) => JSON.stringify(text.length > 60 ? `${text.slice(0, 57)}...` : text);

function show(title: string, chunks: Chunk[]) {
  console.log(`\n${title}: ${chunks.length} chunks`);
  for (const chunk of chunks.slice(0, 4)) {
    const path = chunk.headingPath.length > 0 ? ` [${chunk.headingPath.join(' > ')}]` : '';
    console.log(`  ${chunk.id} ${chunk.start}-${chunk.end}${path} ${preview(chunk.text)}`);
  }
}

function main() {
  const options = { size: 280, overlap: 40 };
  show('Fixed windows (cut mid-word, no structure)', chunkFixed(HANDBOOK, options));
  show('Recursive (paragraphs, then sentences, then words)', chunkRecursive(HANDBOOK, options));
  const sections = chunkMarkdown(HANDBOOK, options);
  show('Markdown-aware (sections with heading paths)', sections);
  const question = 'refund request';
  const match = sections.find((chunk) => chunk.headingPath.join(' ').toLowerCase().includes(question));
  console.log(`\nChunk a retriever would cite for "${question}": ${match?.id} from ${match?.source}, section "${match?.headingPath.join(' > ')}"`);
}

main();
