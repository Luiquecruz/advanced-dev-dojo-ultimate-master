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

export function chunkFixed(document: SourceDocument, options: ChunkOptions): Chunk[] {
  // TODO: reject invalid options, then cut windows of options.size characters that step by size - overlap
  throw new Error('Not implemented');
}

export function chunkRecursive(document: SourceDocument, options: RecursiveChunkOptions): Chunk[] {
  // TODO: split on the coarsest separator first, recurse into pieces that are still too big, merge pieces back up to the size with overlap, trim whitespace
  throw new Error('Not implemented');
}

export function chunkMarkdown(document: SourceDocument, options: ChunkOptions): Chunk[] {
  // TODO: split the text into heading sections, track the heading path with a stack, and chunk each section recursively
  throw new Error('Not implemented');
}
