const LETTERS = { source: 'letters.txt', text: 'abcdefghij'.repeat(25) };

const FIRST_PARAGRAPH = 'Annual plans can be refunded in full within 30 days of purchase.';
const SECOND_PARAGRAPH = 'Monthly plans are not refunded, but you can cancel at any time.';
const PARAGRAPHS = { source: 'refunds.md', text: `${FIRST_PARAGRAPH}\n\n${SECOND_PARAGRAPH}\n` };

const SENTENCES = {
  source: 'retention.md',
  text: 'Closed tickets are kept for 24 months. Admins can export tickets as CSV. Deleted tickets cannot be restored after 30 days. Exports include attachments.',
};

const WORDS = { source: 'words.txt', text: Array.from({ length: 70 }, (_, index) => `word${index}`).join(' ') };

const MARKDOWN = {
  source: 'handbook.md',
  text: `Brightdesk is a helpdesk for small teams.

# Billing

Brightdesk bills per agent seat.

## Refunds

Annual plans can be refunded within 30 days.

### Refund requests

Open a ticket from the account owner's email address.

## Plans

Starter, Growth and Scale.

# Security

## Single sign-on

Single sign-on with SAML is available on the Scale plan. Admins configure it under Settings. Once enforced, password login is disabled for every agent. The account owner keeps a recovery login for emergencies.
`,
};

type ChunkShape = { id: string; source: string; text: string; start: number; end: number; headingPath: string[] };

function expectFaithfulOffsets(document: { source: string; text: string }, chunks: ChunkShape[]) {
  chunks.forEach((chunk, index) => {
    expect(chunk.text).toBe(document.text.slice(chunk.start, chunk.end));
    expect(chunk.source).toBe(document.source);
    expect(chunk.id).toBe(`${document.source}#${index}`);
  });
}

function expectEveryWordCovered(document: { text: string }, chunks: ChunkShape[], ignored: [number, number] = [0, 0]) {
  for (let index = 0; index < document.text.length; index++) {
    if (/\s/.test(document.text[index]) || (ignored[0] <= index && index < ignored[1])) {
      continue;
    }
    expect(chunks.some((chunk) => chunk.start <= index && index < chunk.end)).toBe(true);
  }
}

test('chunkFixed cuts windows of size characters that step by size minus overlap, with exact offsets and the last window ending at the text end', () => {
  const chunks = mod.chunkFixed(LETTERS, { size: 100, overlap: 20 });
  expect(chunks.map((chunk: ChunkShape) => [chunk.start, chunk.end])).toEqual([
    [0, 100],
    [80, 180],
    [160, 250],
  ]);
  expectFaithfulOffsets(LETTERS, chunks);
  chunks.forEach((chunk: ChunkShape) => expect(chunk.headingPath).toEqual([]));
  expect(mod.chunkFixed({ source: 'two.txt', text: 'x'.repeat(200) }, { size: 100, overlap: 0 })).toHaveLength(2);
  expect(mod.chunkFixed({ source: 'empty.txt', text: '' }, { size: 100, overlap: 0 })).toEqual([]);
});

test('every chunker rejects an overlap that is negative or not smaller than the size', () => {
  for (const chunker of [mod.chunkFixed, mod.chunkRecursive, mod.chunkMarkdown]) {
    expect(() => chunker(LETTERS, { size: 50, overlap: 50 })).toThrow(RangeError);
    expect(() => chunker(LETTERS, { size: 50, overlap: 80 })).toThrow(RangeError);
    expect(() => chunker(LETTERS, { size: 50, overlap: -1 })).toThrow(RangeError);
  }
});

test('chunkRecursive keeps paragraphs whole when they fit, then falls back to sentences, never cutting a sentence that fits', () => {
  const paragraphs = mod.chunkRecursive(PARAGRAPHS, { size: 80, overlap: 0 });
  expect(paragraphs.map((chunk: ChunkShape) => chunk.text)).toEqual([FIRST_PARAGRAPH, SECOND_PARAGRAPH]);
  expectFaithfulOffsets(PARAGRAPHS, paragraphs);
  const sentences = mod.chunkRecursive(SENTENCES, { size: 80, overlap: 0 });
  expect(sentences.length).toBeGreaterThan(1);
  sentences.forEach((chunk: ChunkShape) => {
    expect(chunk.text.length).toBeLessThanOrEqual(80);
    expect(chunk.text).toMatch(/\.$/);
  });
  expectFaithfulOffsets(SENTENCES, sentences);
  expectEveryWordCovered(SENTENCES, sentences);
});

test('chunkRecursive never splits a word when a separator exists and overlaps neighbors by at most overlap characters', () => {
  const chunks = mod.chunkRecursive(WORDS, { size: 50, overlap: 15 });
  expect(chunks.length).toBeGreaterThan(5);
  expectFaithfulOffsets(WORDS, chunks);
  expectEveryWordCovered(WORDS, chunks);
  chunks.forEach((chunk: ChunkShape, index: number) => {
    expect(chunk.text.length).toBeLessThanOrEqual(50);
    expect(chunk.start === 0 || WORDS.text[chunk.start - 1] === ' ').toBe(true);
    expect(chunk.end === WORDS.text.length || WORDS.text[chunk.end] === ' ').toBe(true);
    if (index > 0) {
      const shared = chunks[index - 1].end - chunk.start;
      expect(shared).toBeGreaterThan(0);
      expect(shared).toBeLessThanOrEqual(15);
    }
  });
  const separate = mod.chunkRecursive(WORDS, { size: 50, overlap: 0 });
  separate.slice(1).forEach((chunk: ChunkShape, index: number) => expect(chunk.start).toBeGreaterThanOrEqual(separate[index].end));
});

test('chunkRecursive hard-cuts a single word longer than the size and still covers all the text', () => {
  const document = { source: 'token.txt', text: `start ${'z'.repeat(230)} end` };
  const chunks = mod.chunkRecursive(document, { size: 100, overlap: 0 });
  chunks.forEach((chunk: ChunkShape) => expect(chunk.text.length).toBeLessThanOrEqual(100));
  expectFaithfulOffsets(document, chunks);
  expectEveryWordCovered(document, chunks);
});

test('chunkMarkdown gives every chunk the path of headings above it and never lets a chunk cross a section boundary', () => {
  const chunks = mod.chunkMarkdown(MARKDOWN, { size: 120, overlap: 0 });
  expectFaithfulOffsets(MARKDOWN, chunks);
  const paths = chunks.map((chunk: ChunkShape) => chunk.headingPath.join(' > '));
  expect(paths.filter((path: string, index: number) => index === 0 || path !== paths[index - 1])).toEqual([
    '',
    'Billing',
    'Billing > Refunds',
    'Billing > Refunds > Refund requests',
    'Billing > Plans',
    'Security > Single sign-on',
  ]);
  chunks.forEach((chunk: ChunkShape) => {
    const headingLines = chunk.text.match(/^#{1,6} /gm) ?? [];
    expect(headingLines.length).toBeLessThanOrEqual(1);
    if (headingLines.length === 1) {
      expect(chunk.text.startsWith(headingLines[0])).toBe(true);
    }
  });
  expect(chunks.some((chunk: ChunkShape) => chunk.text.trim() === '# Security')).toBe(false);
});

test('chunkMarkdown splits a long section recursively within the size and keeps its heading path on every piece', () => {
  const chunks = mod.chunkMarkdown(MARKDOWN, { size: 120, overlap: 30 });
  const signOn = chunks.filter((chunk: ChunkShape) => chunk.headingPath.join(' > ') === 'Security > Single sign-on');
  expect(signOn.length).toBeGreaterThan(1);
  chunks.forEach((chunk: ChunkShape) => expect(chunk.text.length).toBeLessThanOrEqual(120));
  expectFaithfulOffsets(MARKDOWN, chunks);
  const emptySection = MARKDOWN.text.indexOf('# Security');
  expectEveryWordCovered(MARKDOWN, chunks, [emptySection, emptySection + '# Security'.length]);
  expect(new Set(chunks.map((chunk: ChunkShape) => chunk.id)).size).toBe(chunks.length);
});
