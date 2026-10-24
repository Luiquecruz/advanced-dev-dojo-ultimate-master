import { AppStoreProvider, useAppStore } from './store';

export const products = [
  { id: 1, name: 'Keyboard' },
  { id: 2, name: 'Mouse' },
  { id: 3, name: 'Monitor' },
];

function SettingsPanel() {
  const isOpen = useAppStore((state) => state.isSettingsOpen);
  const toggleSettings = useAppStore((state) => state.toggleSettings);
  const theme = useAppStore((state) => state.theme);
  const density = useAppStore((state) => state.density);
  const setTheme = useAppStore((state) => state.setTheme);
  const toggleDensity = useAppStore((state) => state.toggleDensity);

  return (
    <section>
      <button aria-expanded={isOpen} onClick={toggleSettings}>
        Settings
      </button>
      {isOpen && (
        <div>
          <select aria-label="Theme" value={theme} onChange={(event) => setTheme(event.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <button onClick={toggleDensity}>Density: {density}</button>
        </div>
      )}
    </section>
  );
}

function ProductList() {
  const viewProduct = useAppStore((state) => state.viewProduct);
  return (
    <ul aria-label="Products">
      {products.map((product) => (
        <li key={product.id}>
          <button onClick={() => viewProduct(product.id)}>View {product.name}</button>
        </li>
      ))}
    </ul>
  );
}

function RecentlyViewed() {
  const recentIds = useAppStore((state) => state.recentIds);
  const names = recentIds.map((id) => products.find((product) => product.id === id)?.name);
  return <p data-testid="recent">Recently viewed: {names.join(', ') || 'nothing yet'}</p>;
}

function Shop() {
  const theme = useAppStore((state) => state.theme);
  return (
    <div data-testid="shop" data-theme={theme}>
      <SettingsPanel />
      <ProductList />
      <RecentlyViewed />
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <Shop />
    </AppStoreProvider>
  );
}
