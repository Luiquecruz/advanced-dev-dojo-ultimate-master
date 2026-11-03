1. Separate the briefing into hard rules (tenant isolation, internal articles, the 5-minute freshness promise, citations, handoff), limits (latency, cost) and a quality target (recall@5 on the golden set).
2. Settle the hard rules first; they have one right answer each: permissions before ranking, event-driven indexing with a lag of at most 5 minutes, required citations, handoff without evidence.
3. Filter the eval table: remove rows over the latency or cost limit, then rows under the recall target. Note why each tempting row failed; those notes are your alternatives.
4. Choose among the survivors by simplicity and headroom, and derive the dependent fields: RRF for hybrid retrieval, enough candidates for the reranker, topK equal to what the prompt holds, chunk overlap well below the size.
5. Set the eval gate to the metric the table used and the target the briefing gives, on the same golden set.
6. Write the record with numbers in the context, one "We will" sentence, alternatives tied to the limit that removed them, and honest negative consequences (more services, an event pipeline, reranker latency headroom).
