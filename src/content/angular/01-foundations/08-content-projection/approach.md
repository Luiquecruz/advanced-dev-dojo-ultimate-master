1. Inside `<header>`, add an `<ng-content>` selecting `[panel-title]`.
2. Inside `.panel-body`, add a plain `<ng-content />` for the default slot.
3. Inside `<footer>`, add an `<ng-content>` selecting `[panel-actions]` with `No actions` as its content, which Angular uses as fallback.
4. Check the preview: the second panel shows the fallback, and clicking the projected button still updates the parent's signal.
