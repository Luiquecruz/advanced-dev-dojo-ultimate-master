A slot is `<ng-content />`. Named slots use a CSS selector: `<ng-content select="[panel-title]" />`.
---
The `<ng-content />` without `select` receives everything that matches no other slot.
---
Fallback content goes between the tags: `<ng-content select="[panel-actions]">No actions</ng-content>`.
