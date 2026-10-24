`Tooltip` measures its own height and flips below its anchor when there is not enough room above. It works, but users see it jump: it paints on top first, then moves.

Fix the flicker so the measurement and the correction happen **before the browser paints**.

Props: `anchorTop` (distance in px from the viewport top to the anchor) and `text`.

Keep the behavior:

- Render a `<div role="tooltip">` with `data-placement="top"` or `"bottom"`.
- Measure the tooltip with `getBoundingClientRect().height` through a ref.
- Placement is `top` when `anchorTop >= height`, otherwise `bottom`.
- Measure again when `anchorTop` or `text` changes.

The tests read the commit phases with a `<Profiler>`: a correction applied before paint is reported as `"nested-update"`.
