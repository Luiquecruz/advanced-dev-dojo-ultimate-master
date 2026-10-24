export function Avatar() {
  return <img className="avatar" src="/avatars/katherine.png" alt="Katherine Johnson" />;
}

export function Profile() {
  return (
    <article>
      <Avatar />
      <h3>Katherine Johnson</h3>
    </article>
  );
}

export default function TeamPage() {
  return (
    <section>
      <h1>Our Team</h1>
      <Profile />
      <Profile />
    </section>
  );
}
