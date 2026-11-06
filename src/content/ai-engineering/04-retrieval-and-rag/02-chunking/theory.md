# Chunking

A retriever never returns a whole handbook. It returns **chunks**: pieces small enough to embed well, to rank against each other and to fit several of them in a prompt. Chunking happens once, at ingestion, and every later step inherits its mistakes. A refund rule split in half is retrieved in half, and no reranker or model can recover the missing sentence.

## The ingestion pipeline

```
load → clean → chunk → attach metadata → embed and index
```

Loading turns PDFs, HTML and wiki pages into text; cleaning removes navigation, footers and duplicated boilerplate. Chunking decides the unit of retrieval. Metadata travels with every chunk so you can filter, cite and update later.

## Three strategies

**Fixed-size windows** cut every `size` characters (or tokens) and step forward by `size - overlap`. Simple, predictable and blind: windows cut words, sentences and tables in half. The overlap repeats the end of one window at the start of the next, so a sentence cut at a boundary appears whole in at least one of them, if it is shorter than the overlap.

**Recursive splitting** respects the text's own boundaries. Try the coarsest separator first (blank lines between paragraphs); any piece still too big is split again with the next separator (line breaks, then sentence ends, then spaces); a single word longer than the size is the only thing ever hard-cut. Then adjacent pieces are merged back up to the size, and each new chunk starts with the last pieces of the previous one, up to `overlap` characters.

```ts
const text = 'Para one.\n\nPara two is long. It has sentences.';
chunkRecursive({ source: 'notes.md', text }, { size: 30, overlap: 0 }).map((chunk) => chunk.text);
// separators tried in order: '\n\n', '\n', '. ', ' '
// → ['Para one.', 'Para two is long.', 'It has sentences.']
```

**Structure-aware splitting** uses the document's format. In Markdown, every heading starts a section, and no chunk crosses a section boundary; sections that are too long are split recursively inside. Each chunk records its **heading path** (`Billing > Refunds > Refund requests`), which is context the chunk text alone often lacks: "Requests are answered within 2 business days" means little without knowing it is about refunds. The same idea applies to HTML headings, code (split by function or class) and tables (keep the header row with every slice).

**Semantic chunking** goes further: embed each sentence and start a new chunk where the similarity between neighbors drops. It costs an embedding per sentence and, in published comparisons, often fails to beat a good recursive or structure-aware splitter.

## Metadata is part of the chunk

| Field | Used for |
| --- | --- |
| `source` | citations, deleting every chunk of a document when it changes |
| `start`, `end` | highlighting the cited passage, re-chunking only what changed |
| `headingPath` | display, filtering by section, and prepending context before embedding |
| tenant, ACL, dates | permission filters and freshness (lesson 08) |

Keep offsets exact: `text.slice(start, end)` must equal the chunk text, or citations will point to the wrong place.

**Contextual retrieval** prepends a short description of where a chunk sits (its heading path, or a model-written summary of the document) to the text that is embedded and indexed, while keeping the original text for display. It is cheap with heading paths and measurably reduces retrieval failures.

## Choosing size and overlap

- Smaller chunks rank more precisely but lose context; larger ones carry context but dilute the embedding and fill the prompt faster.
- Start around 200 to 500 tokens with 10 to 20% overlap for prose, then measure recall on a golden set (lesson 07) instead of guessing.
- Use different settings per document type: FAQ entries are already chunks; API references split by endpoint; legal text needs whole clauses.
- Count tokens with the embedding model's tokenizer in production; characters are a teaching approximation.

## Pitfalls

- One chunk size for every document type.
- Losing tables, lists or code blocks by cutting through them (a `#` comment inside a fenced code block is not a heading).
- Chunks without a `source`, so a changed document cannot be re-indexed and old chunks become ghosts.
- Overlap equal to or larger than the size, which never advances.
- Chunks made only of a heading, which match many queries and answer none.

Open-source splitters in the popular frameworks implement these strategies, and contextual retrieval (prepending a short document-level context to each chunk before embedding and indexing) reduces retrieval failures in published tests. Embedding models differ in the input length they accept, so check the limit before choosing a chunk size.

## When to choose it

Use **structure-aware** chunking whenever documents have structure (Markdown, HTML, code, contracts with numbered clauses), with recursive splitting inside long sections. Use **recursive** chunking for unstructured prose. Keep **fixed windows** for logs, transcripts or text with no reliable boundaries. Skip chunking for short, self-contained items (FAQ entries, product records): each item is already the right unit. Whatever you choose, keep source and offsets on every chunk and decide size and overlap from retrieval evals.
