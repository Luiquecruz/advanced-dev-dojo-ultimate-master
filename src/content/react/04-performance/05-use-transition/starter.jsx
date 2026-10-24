import { Suspense, use, useState } from 'react';

const cache = new Map();

function fetchPosts() {
  if (!cache.has('posts')) {
    cache.set('posts', fetch('/api/posts').then((response) => response.json()));
  }
  return cache.get('posts');
}

function AboutTab() {
  return <p>Welcome to the Dojo blog.</p>;
}

function PostsTab() {
  const posts = use(fetchPosts());
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

function ContactTab() {
  return <p>Write to dojo@example.com</p>;
}

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'posts', label: 'Posts' },
  { id: 'contact', label: 'Contact' },
];

export default function TabsApp() {
  const [tab, setTab] = useState('about');
  // TODO: get [isPending, startTransition] from useTransition()

  function selectTab(nextTab) {
    // TODO: mark this update as a transition
    setTab(nextTab);
  }

  return (
    <section>
      <nav>
        {TABS.map(({ id, label }) => (
          <button key={id} aria-pressed={tab === id} onClick={() => selectTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {/* TODO: while the transition is pending, render <p role="status">Switching...</p> */}
      <Suspense fallback={<p>Loading tab...</p>}>
        {tab === 'about' && <AboutTab />}
        {tab === 'posts' && <PostsTab />}
        {tab === 'contact' && <ContactTab />}
      </Suspense>
    </section>
  );
}
