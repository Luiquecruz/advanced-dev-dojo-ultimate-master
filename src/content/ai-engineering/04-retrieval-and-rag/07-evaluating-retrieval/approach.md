1. Evaluate retrieval separately from generation. If the right passage never reaches the prompt, no prompt or model change can fix the answer, and an answer-only eval cannot tell you which half failed.
2. Normalize the retrieved list once (unique ids, first occurrence wins) so a retriever cannot inflate a metric by repeating a hit.
3. Implement each metric for the question it answers: recall@k asks "did we find what matters within the budget we send to the model?", reciprocal rank asks "how far down is the first useful result?", nDCG asks "is the best material at the top, with partial credit for related material?".
4. Compute nDCG relative to the ideal ordering, so scores are comparable between queries with one relevant passage and queries with many, and handle the zero-ideal case explicitly.
5. Keep per-query results next to the means: averages tell you whether a change helped, per-query rows tell you which queries to look at.
6. Compare retrievers on the same golden set with the same k, and rank them by the metric that matches your product (nDCG when order matters, recall when the model reads everything you send).
