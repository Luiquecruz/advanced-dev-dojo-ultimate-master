import { renderToString } from 'react-dom/server';
import App, { ErrorPage } from '../App';
import { getCatalogViewModel } from './bff';

export function serializeForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function renderDocument(appHtml, embeddedJson) {
  const dataScript = embeddedJson ? `<script id="catalog-data" type="application/json">${embeddedJson}</script>` : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Dev Dojo Store</title></head><body><div id="root">${appHtml}</div>${dataScript}</body></html>`;
}

function renderErrorPage(status, title) {
  return { status, html: renderDocument(renderToString(<ErrorPage title={title} />), null) };
}

export async function handleRequest(url) {
  const { pathname } = new URL(url, 'http://localhost');
  if (pathname !== '/') {
    return renderErrorPage(404, 'Page not found');
  }
  try {
    const catalog = await getCatalogViewModel();
    const appHtml = renderToString(<App catalog={catalog} />);
    return { status: 200, html: renderDocument(appHtml, serializeForScript(catalog)) };
  } catch {
    return renderErrorPage(502, 'Catalog unavailable');
  }
}
