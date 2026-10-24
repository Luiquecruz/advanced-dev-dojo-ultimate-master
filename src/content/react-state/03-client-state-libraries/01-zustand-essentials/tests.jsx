const player = () => modules['playerStore.js'];
const tracks = [
  { id: 1, title: 'Blue in Green', duration: 337 },
  { id: 2, title: 'So What', duration: 562 },
];

test('togglePlay ignores an empty queue; next advances and stops playing after the last track', () => {
  const store = player().usePlayerStore;
  const { enqueue, togglePlay, next } = store.getState().actions;
  togglePlay();
  expect(store.getState().isPlaying).toBe(false);
  enqueue(tracks[0]);
  enqueue(tracks[1]);
  togglePlay();
  expect(store.getState().isPlaying).toBe(true);
  next();
  expect(store.getState().currentIndex).toBe(1);
  expect(store.getState().isPlaying).toBe(true);
  next();
  expect(store.getState().currentIndex).toBe(1);
  expect(store.getState().isPlaying).toBe(false);
});

test('usePlayerActions returns the same actions object across updates', () => {
  const { usePlayerActions } = player();
  const { result } = renderHook(() => usePlayerActions());
  const first = result.current;
  act(() => first.enqueue(tracks[0]));
  act(() => first.togglePlay());
  expect(result.current).toBe(first);
});

test('a component using only useIsPlaying does not re-render when the queue changes', () => {
  const { useIsPlaying, usePlayerStore } = player();
  const renders = fn();
  function PlayIcon() {
    const isPlaying = useIsPlaying();
    renders();
    return <span>{isPlaying ? 'playing' : 'idle'}</span>;
  }
  render(<PlayIcon />);
  act(() => usePlayerStore.getState().actions.enqueue(tracks[0]));
  act(() => usePlayerStore.getState().actions.enqueue(tracks[1]));
  expect(renders).toHaveBeenCalledTimes(1);
  act(() => usePlayerStore.getState().actions.togglePlay());
  expect(screen.getByText('playing')).toBeInTheDocument();
  expect(renders).toHaveBeenCalledTimes(2);
});

test('useQueueTitles returns a derived array without looping and ignores play/pause', () => {
  const { useQueueTitles, usePlayerStore } = player();
  const renders = fn();
  function Titles() {
    const titles = useQueueTitles();
    renders();
    return <p>{titles.join(' / ') || 'empty'}</p>;
  }
  render(<Titles />);
  act(() => usePlayerStore.getState().actions.enqueue(tracks[0]));
  expect(screen.getByText('Blue in Green')).toBeInTheDocument();
  act(() => usePlayerStore.getState().actions.togglePlay());
  act(() => usePlayerStore.getState().actions.togglePlay());
  expect(renders).toHaveBeenCalledTimes(2);
});

test('the app queues tracks, plays, skips and shows the total duration', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.getByTestId('now-playing')).toHaveTextContent('Queue is empty');
  await user.click(screen.getByRole('button', { name: 'Queue Blue in Green' }));
  await user.click(screen.getByRole('button', { name: 'Queue Naima' }));
  expect(screen.getByTestId('queue-duration')).toHaveTextContent('Queue: 9:58');
  await user.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByTestId('now-playing')).toHaveTextContent('Playing: Blue in Green');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByTestId('now-playing')).toHaveTextContent('Playing: Naima');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByTestId('now-playing')).toHaveTextContent('Paused: Naima');
});

test('the store resets to its initial state with getInitialState', () => {
  const { usePlayerStore } = player();
  usePlayerStore.getState().actions.enqueue(tracks[0]);
  usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  expect(usePlayerStore.getState().queue).toEqual([]);
  expect(typeof usePlayerStore.getState().actions.next).toBe('function');
  expect(sources['playerStore.js']).toMatch(/useShallow/);
});
