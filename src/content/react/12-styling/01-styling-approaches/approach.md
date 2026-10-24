1. Keep the destructured props: everything the button does not know about stays in `rest`.
2. Call `clsx` with the fixed class, the two template-string classes, an object for the boolean class and the incoming `className` last.
3. Spread `rest` on the `<button>` so events and attributes reach the DOM element.
4. In `ProgressBar`, clamp the number once and reuse it for both the ARIA attribute and the inline style.
5. Inline style is the right tool here: the width is a runtime value, while colors and layout stay in classes.
