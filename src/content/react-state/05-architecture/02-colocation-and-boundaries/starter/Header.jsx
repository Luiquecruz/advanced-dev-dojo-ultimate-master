import { useAppStore } from './store';
import { renderCounts } from './renderLog';

export function Header() {
  renderCounts.Header += 1;
  // TODO: subscribe only to theme/toggleTheme with selectors, and keep the menu state local with useState
  const { theme, toggleTheme, isMenuOpen, toggleMenu } = useAppStore();

  return (
    <header>
      <button onClick={toggleTheme}>Theme: {theme}</button>
      <button aria-expanded={isMenuOpen} onClick={toggleMenu}>
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
