import { MemoryRouter, NavLink, Route, Routes, useNavigate } from 'react-router';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Page not found</h1>
      <button onClick={() => navigate('/')}>Go home</button>
    </div>
  );
}

export function AppRoutes() {
  return (
    <>
      <nav>
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="/about" element={<h1>About</h1>} />
        <Route path="*" element={<NotFound />} />
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
