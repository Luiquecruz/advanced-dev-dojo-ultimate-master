import { useState } from 'react';

export function Shell({ shell }) {
  const [currentPath, setCurrentPath] = useState(shell.pages[0]?.path);
  const currentPage = shell.pages.find((page) => page.path === currentPath);

  return (
    <div className="shell">
      <nav aria-label="Modules">
        <ul>
          {shell.pages.map((page) => (
            <li key={page.path}>
              <button
                type="button"
                aria-current={page.path === currentPath ? 'page' : undefined}
                onClick={() => setCurrentPath(page.path)}
              >
                {page.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main>{currentPage && <currentPage.Component events={shell.events} />}</main>
    </div>
  );
}
