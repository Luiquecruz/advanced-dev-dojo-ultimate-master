import { renderToString } from 'react-dom/server';
import App, { ErrorPage } from '../App';
import { getCatalogViewModel } from './bff';

export function serializeForScript(value) {
  // TODO: escape "<" so the data can never close the script tag
  return JSON.stringify(value);
}

function renderDocument(appHtml, embeddedJson) {
  const dataScript = embeddedJson ? `<script id="catalog-data" type="application/json">${embeddedJson}</script>` : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Dev Dojo Store</title></head><body><div id="root">${appHtml}</div>${dataScript}</body></html>`;
}

function renderErrorPage(status, title) {
  return { status, html: renderDocument(renderToString(<ErrorPage title={title} />), null) };
}

export async function handleRequest(url) {
  // TODO: answer 404 "Page not found" for any path other than "/" without calling the BFF
  // TODO: answer 502 "Catalog unavailable" when the BFF throws
  const catalog = await getCatalogViewModel();
  const appHtml = renderToString(<App catalog={catalog} />);
  return { status: 200, html: renderDocument(appHtml, serializeForScript(catalog)) };
}
