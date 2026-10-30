export function Layout({ title, children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
      </head>
      <body>
        <header>
          <a href="/products">Shop</a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
