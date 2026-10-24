import { Header } from './Header';
import { PostCard } from './PostCard';
import { useAppStore } from './store';

export const posts = [
  { id: 1, title: 'Colocate state', body: 'Keep state as close as possible to where it is used.' },
  { id: 2, title: 'Promote with care', body: 'Lift or globalize state only when a real consumer needs it.' },
];

export default function App() {
  const theme = useAppStore((state) => state.theme);
  return (
    <div data-testid="app" data-theme={theme}>
      <Header />
      <main>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </main>
    </div>
  );
}
