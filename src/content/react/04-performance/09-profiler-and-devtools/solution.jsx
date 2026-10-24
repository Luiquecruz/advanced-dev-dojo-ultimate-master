import { Profiler, useState } from 'react';

export function createRenderLog() {
  const entries = [];

  function onRender(id, phase, actualDuration) {
    entries.push({ id, phase, actualDuration });
  }

  function summary() {
    const result = {};
    for (const { id, phase } of entries) {
      result[id] ??= { mount: 0, update: 0 };
      result[id][phase === 'mount' ? 'mount' : 'update'] += 1;
    }
    return result;
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
      <Profiler id="Sidebar" onRender={onRender}>
        <Sidebar />
      </Profiler>
      <Profiler id="Feed" onRender={onRender}>
        <Feed />
      </Profiler>
    </div>
  );
}
