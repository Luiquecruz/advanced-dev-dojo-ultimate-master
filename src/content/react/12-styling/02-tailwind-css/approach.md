1. Store the shared badge classes in a `base` constant.
2. Fill the `tones` object with the complete class string for each status, including the `dark:` variants.
3. Replace the dynamic `bg-${status}-100` string with a lookup: join `base` and `tones[status]` (with `clsx` or a template string that joins whole variables).
4. Put the card classes on the `<article>` and the typography classes on the `<h3>`.
5. Remember that `md:p-6` overrides `p-4` from the `md` breakpoint up: mobile first.
