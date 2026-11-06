import { create } from 'zustand';

export const usePlayerStore = create((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  actions: {
    enqueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
    togglePlay: () => {
      // TODO: do nothing when the queue is empty, otherwise flip isPlaying
    },
    next: () => {
      // TODO: advance currentIndex, or stop playing (isPlaying: false) when already on the last track
    },
    clear: () => set({ queue: [], currentIndex: 0, isPlaying: false }),
  },
}));

// TODO: each hook must select only what it returns, so components re-render only when that value changes
export const useCurrentTrack = () => {
  const { queue, currentIndex } = usePlayerStore();
  return queue[currentIndex] ?? null;
};

export const useIsPlaying = () => usePlayerStore().isPlaying;

export const useQueueDuration = () => usePlayerStore().queue.reduce((sum, track) => sum + track.duration, 0);

// TODO: this selector builds a new array on every call; make it stable with useShallow
export const useQueueTitles = () => usePlayerStore((state) => state.queue.map((track) => track.title));

export const usePlayerActions = () => usePlayerStore().actions;
