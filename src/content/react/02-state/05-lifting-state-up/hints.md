Only one panel can be open, so the information "which panel is open" must live in **one** place that sees both panels: their parent, `Accordion`.
---
Delete the `useState` from `Panel` and destructure `isActive` and `onShow` from props instead. The `Show` button becomes `<button onClick={onShow}>Show</button>`.
---
In `Accordion`, add `const [activeIndex, setActiveIndex] = useState(0);` and pass `isActive={activeIndex === 0}` with `onShow={() => setActiveIndex(0)}` to the first panel, and the same with `1` for the second.
