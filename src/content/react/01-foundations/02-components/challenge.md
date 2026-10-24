The `TeamPage` below has two classic component bugs. Fix them and expose the components so they can be reused.

1. Rename `avatar` to **`Avatar`** and export it as a **named export**. It renders `<img className="avatar" src="/avatars/katherine.png" alt="Katherine Johnson" />`.
2. Move `Profile` out of `TeamPage` to the **top level** of the file and export it as a **named export**. It renders an `<article>` with `<Avatar />` and an `<h3>` with the text `Katherine Johnson`.
3. Keep `TeamPage` as the **default export**. It renders a `<section>` with an `<h1>` `Our Team` followed by **two** `<Profile />` elements.
