import { useCurrentTrack, useIsPlaying, usePlayerActions, useQueueDuration, useQueueTitles } from './playerStore';

export const library = [
  { id: 1, title: 'Blue in Green', duration: 337 },
  { id: 2, title: 'So What', duration: 562 },
  { id: 3, title: 'Naima', duration: 261 },
];

const formatDuration = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function Library() {
  const { enqueue } = usePlayerActions();
  return (
    <ul aria-label="Library">
      {library.map((track) => (
        <li key={track.id}>
          {track.title}
          <button onClick={() => enqueue(track)}>Queue {track.title}</button>
        </li>
      ))}
    </ul>
  );
}

function PlayerBar() {
  const track = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const { togglePlay, next } = usePlayerActions();
  return (
    <section aria-label="Player">
      <p data-testid="now-playing">{track ? `${isPlaying ? 'Playing' : 'Paused'}: ${track.title}` : 'Queue is empty'}</p>
      <button onClick={togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
      <button onClick={next}>Next</button>
    </section>
  );
}

function QueueList() {
  const titles = useQueueTitles();
  const duration = useQueueDuration();
  const { clear } = usePlayerActions();
  return (
    <section aria-label="Queue">
      <p data-testid="queue-duration">Queue: {formatDuration(duration)}</p>
      <ol>
        {titles.map((title, index) => (
          <li key={index}>{title}</li>
        ))}
      </ol>
      <button onClick={clear}>Clear queue</button>
    </section>
  );
}

export default function App() {
  return (
    <main>
      <Library />
      <PlayerBar />
      <QueueList />
    </main>
  );
}
