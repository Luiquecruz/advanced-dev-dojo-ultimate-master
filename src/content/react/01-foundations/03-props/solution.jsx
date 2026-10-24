export function Avatar({ name, imageUrl, size = 64 }) {
  return <img src={imageUrl} alt={name} width={size} height={size} />;
}

export function Profile({ name, role, imageUrl }) {
  return (
    <article>
      <Avatar name={name} imageUrl={imageUrl} size={96} />
      <h3>{name}</h3>
      <p>{role}</p>
    </article>
  );
}

export default function TeamPage() {
  return (
    <section>
      <Profile name="Ada Lovelace" role="Mathematician" imageUrl="/avatars/ada.png" />
      <Profile name="Grace Hopper" role="Computer Scientist" imageUrl="/avatars/grace.png" />
    </section>
  );
}
