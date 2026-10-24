const withTooltipHeight = (height, run) => {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, top: 0, left: 0, right: 160, bottom: height, width: 160, height, toJSON() {} };
  };
  try {
    return run();
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original;
  }
};

test('stays on top when there is enough room above the anchor', () => {
  withTooltipHeight(40, () => {
    const Tooltip = mod.default;
    render(<Tooltip anchorTop={100} text="Copied!" />);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-placement', 'top');
  });
});

test('flips to the bottom when the tooltip does not fit above', () => {
  withTooltipHeight(40, () => {
    const Tooltip = mod.default;
    render(<Tooltip anchorTop={10} text="Copied!" />);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-placement', 'bottom');
  });
});

test('measures again when anchorTop changes', () => {
  withTooltipHeight(40, () => {
    const Tooltip = mod.default;
    const { rerender } = render(<Tooltip anchorTop={10} text="Copied!" />);
    rerender(<Tooltip anchorTop={200} text="Copied!" />);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-placement', 'top');
  });
});

test('commits the corrected placement before paint (Profiler reports a "nested-update")', () => {
  withTooltipHeight(40, () => {
    const Tooltip = mod.default;
    const onRender = fn();
    render(
      <React.Profiler id="tooltip" onRender={onRender}>
        <Tooltip anchorTop={10} text="Copied!" />
      </React.Profiler>,
    );
    expect(onRender.mock.calls.map(([, phase]) => phase)).toEqual(['mount', 'nested-update']);
  });
});

test('uses useLayoutEffect', () => {
  expect(source).toMatch(/useLayoutEffect\s*\(/);
});
