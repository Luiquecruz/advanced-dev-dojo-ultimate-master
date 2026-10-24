import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export const usePlayerStore = create((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  actions: {
    enqueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
    togglePlay: () => {
      if (get().queue.length === 0) return;
      set((state) => ({ isPlaying: !state.isPlaying }));
    },
    next: () => {
      const { currentIndex, queue } = get();
      if (currentIndex < queue.length - 1) {
        set({ currentIndex: currentIndex + 1 });
      } else {
        set({ isPlaying: false });
      }
    },
    clear: () => set({ queue: [], currentIndex: 0, isPlaying: false }),
  },
}));

export const useCurrentTrack = () => usePlayerStore((state) => state.queue[state.currentIndex] ?? null);

export const useIsPlaying = () => usePlayerStore((state) => state.isPlaying);

export const useQueueDuration = () => usePlayerStore((state) => state.queue.reduce((sum, track) => sum + track.duration, 0));

export const useQueueTitles = () => usePlayerStore(useShallow((state) => state.queue.map((track) => track.title)));

export const usePlayerActions = () => usePlayerStore((state) => state.actions);
