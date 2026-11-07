import { useState } from 'react';
import { useAppStore } from './store';
import { renderCounts } from './renderLog';

export function Header() {
  renderCounts.Header += 1;
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header>
      <button onClick={toggleTheme}>Theme: {theme}</button>
      <button aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}>
        Menu
      </button>
      {isMenuOpen && (
        <nav aria-label="Main menu">
          <a href="#posts">Posts</a>
          <a href="#about">About</a>
        </nav>
      )}
    </header>
  );
}
