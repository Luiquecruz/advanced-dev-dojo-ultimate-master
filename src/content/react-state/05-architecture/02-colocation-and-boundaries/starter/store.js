import { create } from 'zustand';

// TODO: keep only what is truly shared (theme + toggleTheme); move the rest next to the components that use it
export const useAppStore = create((set) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  isMenuOpen: false,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  commentDraft: '',
  setCommentDraft: (commentDraft) => set({ commentDraft }),
  expandedPostId: null,
  setExpandedPostId: (expandedPostId) => set({ expandedPostId }),
}));
