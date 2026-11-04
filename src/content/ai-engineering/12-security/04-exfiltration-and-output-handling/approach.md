1. Start with the URL decision, because every construct depends on it: parse with the platform parser, check scheme, credentials and port, then compare the normalized hostname exactly against the allowlist. Return a reason, so removals are explainable and monitorable.
2. Treat constructs by what they cost the attacker: images and HTML fire without a click, links need one. That is why allowed images still lose their query string while allowed links stay unchanged.
3. Handle line-based syntax (reference definitions) first, then everything inline in a single regex pass with ordered alternatives. A single pass prevents a replacement from producing text that a later pass misreads, and the order of alternatives resolves overlaps (an autolink is also a tag; a link contains a URL).
4. Keep sentence punctuation outside bare URLs, as markdown renderers do, so a removal does not eat the end of the sentence.
5. Record every removal with its kind, value and reason. That list is the evidence your monitoring and red-team suite (lesson 08) will count.
6. Separate removal from encoding: sanitizing decides what may appear, encoding makes what remains inert in its destination. Encode once, at insertion, for that exact context.
7. In the model call, keep untrusted content out of the system message and sanitize the reply on the way out, whatever the model was told.
