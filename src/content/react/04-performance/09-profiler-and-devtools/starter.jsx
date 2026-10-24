import { useState } from 'react';

export function createRenderLog() {
  const entries = [];

  function onRender(id, phase, actualDuration) {
    // TODO: push { id, phase, actualDuration } into entries
  }

  function summary() {
    // TODO: return { [id]: { mount: number, update: number } } counted from entries
    // phase "mount" counts as mount; "update" and "nested-update" count as update
    return {};
  }

  return { entries, onRender, summary };
}

function Sidebar() {
  return (
    <aside>
      <h2>Channels</h2>
      <ul>
        <li>#general</li>
        <li>#random</li>
      </ul>
    </aside>
  );
}

function Feed() {
  const [likes, setLikes] = useState(0);
  return (
    <section>
      <h2>Feed</h2>
      <button onClick={() => setLikes((current) => current + 1)}>Like ({likes})</button>
    </section>
  );
}

export default function App({ onRender = () => {} }) {
  return (
    <div>
      {/* TODO: wrap Sidebar in <Profiler id="Sidebar" onRender={onRender}> */}
      <Sidebar />
      {/* TODO: wrap Feed in <Profiler id="Feed" onRender={onRender}> */}
      <Feed />
    </div>
  );
}
