Event bindings use parentheses: `(input)="updateDraft($event)"`, `(click)="send()"`.
---
In `updateDraft`, the value lives on the target element: `(event.target as HTMLInputElement).value`.
---
Angular filters keys for you: `(keydown.enter)="send()"` and `(keydown.escape)="clear()"`. In `send()`, trim first, return early when empty, then `messages.update(list => [...list, text])` and `draft.set('')`.
