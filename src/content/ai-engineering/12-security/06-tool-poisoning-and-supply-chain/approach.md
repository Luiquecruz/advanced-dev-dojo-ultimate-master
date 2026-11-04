1. Treat every word of a tool definition as model input. List every text the model will read (description and parameter descriptions) before deciding what to look for.
2. Write each detection rule as a small, explainable check that returns where it fired and what it saw. Reviewers need the excerpt, and false positives are cheaper to dismiss when they are specific.
3. Make the fingerprint deterministic: canonicalize the definition (sorted keys at every depth) before hashing, so only real changes alter the hash.
4. Decide trust per server before looking at its tools: an id that is not allowlisted, or an allowlisted id at a different URL, is blocked outright.
5. For each tool, order the decisions from most to least dangerous: poisoned beats changed, changed beats new, and only an exact pin match reaches the model.
6. Make approval refuse what the scanner flags, so a hurried click cannot pin a poisoned definition.
7. Offer the model only the approved list, under qualified names, and re-run the review every time a server's tool list changes.
