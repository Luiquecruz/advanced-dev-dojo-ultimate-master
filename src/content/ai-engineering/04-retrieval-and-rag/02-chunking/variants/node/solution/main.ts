export interface SourceDocument {
  source: string;
  text: string;
}

export interface Chunk {
  id: string;
  source: string;
  text: string;
  start: number;
  end: number;
  headingPath: string[];
}

export interface ChunkOptions {
  size: number;
  overlap: number;
}

export interface RecursiveChunkOptions extends ChunkOptions {
  separators?: string[];
}

export const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' '];

type Range = [number, number];

const HEADING_PATTERN = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm;

function assertOptions({ size, overlap }: ChunkOptions): void {
  if (size <= 0 || overlap < 0 || overlap >= size) {
    throw new RangeError(`Invalid chunk options: size ${size}, overlap ${overlap}. Overlap must be at least 0 and smaller than size.`);
  }
}

function toChunks(document: SourceDocument, ranges: Range[], headingPath: string[], firstIndex = 0): Chunk[] {
  return ranges.map(([start, end], index) => ({
    id: `${document.source}#${firstIndex + index}`,
    source: document.source,
    text: document.text.slice(start, end),
    start,
    end,
    headingPath,
  }));
}

export function chunkFixed(document: SourceDocument, options: ChunkOptions): Chunk[] {
  assertOptions(options);
  const ranges: Range[] = [];
  const length = document.text.length;
  for (let start = 0; start < length; start += options.size - options.overlap) {
    const end = Math.min(start + options.size, length);
    ranges.push([start, end]);
    if (end === length) {
      break;
    }
  }
  return toChunks(document, ranges, []);
}

function splitRange(text: string, start: number, end: number, size: number, separators: string[]): Range[] {
  if (end - start <= size) {
    return [[start, end]];
  }
  const [separator, ...finer] = separators;
  if (separator === undefined) {
    const pieces: Range[] = [];
    for (let pieceStart = start; pieceStart < end; pieceStart += size) {
      pieces.push([pieceStart, Math.min(pieceStart + size, end)]);
    }
    return pieces;
  }
  const pieces: Range[] = [];
  let pieceStart = start;
  let found = text.indexOf(separator, start);
  while (found !== -1 && found + separator.length <= end) {
    pieces.push([pieceStart, found + separator.length]);
    pieceStart = found + separator.length;
    found = text.indexOf(separator, pieceStart);
  }
  if (pieceStart < end) {
    pieces.push([pieceStart, end]);
  }
  return pieces.flatMap(([from, to]) => splitRange(text, from, to, size, finer));
}

function mergePieces(pieces: Range[], size: number, overlap: number): Range[] {
  const merged: Range[] = [];
  let current: Range[] = [];
  for (const piece of pieces) {
    if (current.length > 0 && piece[1] - current[0][0] > size) {
      const currentEnd = current[current.length - 1][1];
      merged.push([current[0][0], currentEnd]);
      const carried: Range[] = [];
      for (let index = current.length - 1; index >= 0; index--) {
        const candidateStart = current[index][0];
        if (currentEnd - candidateStart > overlap || piece[1] - candidateStart > size) {
          break;
        }
        carried.unshift(current[index]);
      }
      current = carried;
    }
    current.push(piece);
  }
  if (current.length > 0) {
    merged.push([current[0][0], current[current.length - 1][1]]);
  }
  return merged;
}

function trimRange(text: string, [start, end]: Range): Range {
  let trimmedStart = start;
  let trimmedEnd = end;
  while (trimmedStart < trimmedEnd && /\s/.test(text[trimmedStart])) {
    trimmedStart++;
  }
  while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1])) {
    trimmedEnd--;
  }
  return [trimmedStart, trimmedEnd];
}

function recursiveRanges(text: string, start: number, end: number, options: RecursiveChunkOptions): Range[] {
  const pieces = splitRange(text, start, end, options.size, options.separators ?? DEFAULT_SEPARATORS);
  return mergePieces(pieces, options.size, options.overlap)
    .map((range) => trimRange(text, range))
    .filter(([from, to]) => to > from);
}

export function chunkRecursive(document: SourceDocument, options: RecursiveChunkOptions): Chunk[] {
  assertOptions(options);
  return toChunks(document, recursiveRanges(document.text, 0, document.text.length, options), []);
}

export function chunkMarkdown(document: SourceDocument, options: ChunkOptions): Chunk[] {
  assertOptions(options);
  const headings = [...document.text.matchAll(HEADING_PATTERN)].map((match) => ({ start: match.index, bodyStart: match.index + match[0].length, level: match[1].length, title: match[2] }));
  const sections: Array<{ start: number; end: number; headingPath: string[] }> = [];
  const firstHeadingStart = headings.length > 0 ? headings[0].start : document.text.length;
  sections.push({ start: 0, end: firstHeadingStart, headingPath: [] });
  const stack: Array<{ level: number; title: string }> = [];
  headings.forEach((heading, index) => {
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }
    stack.push(heading);
    const end = index + 1 < headings.length ? headings[index + 1].start : document.text.length;
    if (document.text.slice(heading.bodyStart, end).trim() === '') {
      return;
    }
    sections.push({ start: heading.start, end, headingPath: stack.map((entry) => entry.title) });
  });
  const chunks: Chunk[] = [];
  for (const section of sections) {
    const ranges = recursiveRanges(document.text, section.start, section.end, options);
    chunks.push(...toChunks(document, ranges, section.headingPath, chunks.length));
  }
  return chunks;
}
