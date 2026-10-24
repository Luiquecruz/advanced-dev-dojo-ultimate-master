Instead of `{tab === 'compose' && <ComposePanel />}`, always render the panel and let `<Activity>` decide whether it is visible.
---
`<Activity mode={tab === 'compose' ? 'visible' : 'hidden'}><ComposePanel /></Activity>` and the same for History.
---
You don't need to change the panels: Activity preserves `ComposePanel`'s state and runs `HistoryPanel`'s effect cleanup automatically when hidden.
