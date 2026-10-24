// TODO: component names must start with a capital letter, and this one should be a named export
function avatar() {
  return <img className="avatar" src="/avatars/katherine.png" alt="Katherine Johnson" />;
}

export default function TeamPage() {
  // TODO: move Profile to the top level of the file and export it
  function Profile() {
    return (
      <article>
        <avatar />
        <h3>Katherine Johnson</h3>
      </article>
    );
  }

  return (
    <section>
      <h1>Our Team</h1>
      <Profile />
      <Profile />
    </section>
  );
}
