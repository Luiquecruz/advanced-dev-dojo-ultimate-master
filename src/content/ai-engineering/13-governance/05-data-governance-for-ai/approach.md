1. Make data describable before it is governable: every field gets a classification and a personal-data flag, and anything unlabeled is treated as the most sensitive class.
2. Tie every model call to a declared purpose. The purpose decides which fields may travel, whether consent is needed, how sensitive the data may be and how long results may be kept.
3. Check before you call. A refusal must happen before any byte reaches the provider, and it must explain itself with reasons.
4. Minimize by allowlist, not by blocklist: send only the fields the purpose names, so a new column added to the record next month stays home by default.
5. Record each processing with its expiry at the moment it happens, so retention is a computation rather than a judgment call made later.
6. Implement retention and erasure as routine operations over those records, so a deletion request or a retention job is a filter, not a project.
