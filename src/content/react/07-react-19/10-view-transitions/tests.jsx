function ensureCssEscape() {
  if (!globalThis.CSS) {
    globalThis.CSS = { escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (char) => '\\' + char), supports: () => false };
  }
}

function recordViewTransitions() {
  ensureCssEscape();
  const transitions = [];
  const addedAnimate = !document.documentElement.animate;
  const addedFonts = !document.fonts;
  if (addedAnimate) document.documentElement.animate = () => ({ cancel() {}, finished: Promise.resolve() });
  if (addedFonts) Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loaded', ready: Promise.resolve() } });
  document.startViewTransition = ({ update, types }) => {
    const entry = { types: [...(types ?? [])], before: document.body.innerHTML, after: '' };
    transitions.push(entry);
    const done = Promise.resolve()
      .then(update)
      .then(() => {
        entry.after = document.body.innerHTML;
      });
    return { ready: new Promise(() => {}), finished: done, updateCallbackDone: done, skipTransition() {}, types: new Set(types) };
  };
  const restore = () => {
    delete document.startViewTransition;
    if (addedAnimate) delete document.documentElement.animate;
    if (addedFonts) delete document.fonts;
  };
  return { transitions, restore };
}

test('Next shows the following slide and the counter', async () => {
  ensureCssEscape();
  const Slideshow = mod.default;
  render(<Slideshow />);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByRole('heading', { name: 'Activity' })).toBeInTheDocument();
  expect(screen.getByText('Slide 2 of 3')).toBeInTheDocument();
});

test('Previous on the first slide wraps around to the last one', async () => {
  ensureCssEscape();
  const Slideshow = mod.default;
  render(<Slideshow />);
  await user.click(screen.getByRole('button', { name: 'Previous' }));
  expect(await screen.findByRole('heading', { name: 'View Transitions' })).toBeInTheDocument();
  expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument();
});

test('Next starts a view transition tagged with the "next" type', async () => {
  const { transitions, restore } = recordViewTransitions();
  try {
    const Slideshow = mod.default;
    render(<Slideshow />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Activity' });
    expect(transitions).toHaveLength(1);
    expect(transitions[0].types).toEqual(['next']);
  } finally {
    restore();
  }
});

test('Previous starts a view transition tagged with the "previous" type', async () => {
  const { transitions, restore } = recordViewTransitions();
  try {
    const Slideshow = mod.default;
    render(<Slideshow />);
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await screen.findByRole('heading', { name: 'View Transitions' });
    expect(transitions).toHaveLength(1);
    expect(transitions[0].types).toEqual(['previous']);
  } finally {
    restore();
  }
});

test('maps the transition type to enter and exit classes', async () => {
  const { transitions, restore } = recordViewTransitions();
  try {
    const Slideshow = mod.default;
    render(<Slideshow />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Activity' });
    await waitFor(() => expect(transitions[0]?.after).not.toBe(''));
    expect(transitions[0].before).toMatch(/view-transition-class:\s*slide-to-left/);
    expect(transitions[0].after).toMatch(/view-transition-class:\s*slide-from-right/);
  } finally {
    restore();
  }
});

test('uses <ViewTransition> and addTransitionType', () => {
  expect(source).toMatch(/<ViewTransition[\s>]/);
  expect(source).toMatch(/addTransitionType\(/);
});
