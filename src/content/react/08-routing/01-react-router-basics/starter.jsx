import { MemoryRouter, NavLink, Route, Routes, useNavigate } from 'react-router';

function NotFound() {
  // TODO: get navigate with useNavigate() and send the user to "/" on click
  return (
    <div>
      <h1>Page not found</h1>
      <button>Go home</button>
    </div>
  );
}

export function AppRoutes() {
  return (
    <>
      <nav>
        {/* TODO: replace the anchors with NavLink (remember `end` for Home) */}
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        {/* TODO: add the /about route and the catch-all NotFound route */}
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <MemoryRouter>
      <AppRoutes />
    </MemoryRouter>
  );
}
