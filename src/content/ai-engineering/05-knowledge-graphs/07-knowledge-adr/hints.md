Start from the competency questions, not the prose. Each arrow in "supplier → part → product → regulation" is a relation with a domain and a range; write those relations first and count the hops of the longest question to choose `maxHops`.
---
Read every sentence of the briefing as a requirement for a flag: "traceable to its source document" is provenance, "many spellings" is entity resolution, "logged, not silently dropped" is the rejected log, and a shared vocabulary only helps if extraction is validated against it.
---
Compute the cost for the minimum number of rebuilds first: 8 700 × 0.004 is about $35, and each rebuild adds $45. Check which numbers of rebuilds keep the total within $250 while meeting the freshness rule; the answer is narrow. The global question needs community summaries, not `'none'`.
---
Write the ADR from the plan. The context restates the forces with numbers; the decision is one "We will..." sentence covering representation, extraction safeguards, local and global retrieval and the metric; rejected alternatives such as plain vector RAG, RDF with OWL, daily rebuilds or generated SQL for the metric each cite the briefing fact that rules them out.
