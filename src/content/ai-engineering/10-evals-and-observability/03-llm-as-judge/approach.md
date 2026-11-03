1. Treat the judge as a model call like any other: a precise request (criteria, scale, reply shape, temperature 0) and defensive parsing of its reply.
2. Keep the judged answer in the user message as delimited data, so instructions hidden inside it do not become part of the judge's instructions.
3. Validate every score against the rubric: a missing criterion, a fraction or a value outside the scale makes the whole judgment unusable. Unusable means retry, then report invalid; never invent a default score.
4. Calibrate with chance-corrected agreement: compute each rater's label distribution, the agreement expected by chance, and kappa. Keep the disagreement indexes, because reading them is how you fix the rubric.
5. For pairwise comparisons, run both orders and translate positions back to answers before comparing votes. A winner that flips with the order is position bias, so it becomes a tie and is flagged as inconsistent.
