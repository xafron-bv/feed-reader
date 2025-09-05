let corsBlockedPreference: boolean | null = null;

function isCorsBlocked(): boolean {
  if (corsBlockedPreference !== null) return corsBlockedPreference;
  try {
    if (typeof localStorage !== 'undefined') {
      corsBlockedPreference = localStorage.getItem('rss_reader_cors_blocked') === '1';
    } else {
      corsBlockedPreference = false;
    }
  } catch {
    corsBlockedPreference = false;
  }
  return corsBlockedPreference;
}

function rememberCorsBlocked() {
  corsBlockedPreference = true;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem('rss_reader_cors_blocked', '1'); } catch {}
}

function buildProxyUrl(url: string): string {
  const base = 'https://go.x2u.in/proxy?email=admin@xafron.nl&apiKey=0dd92037&url=';
  return `${base}${encodeURIComponent(url)}`;
}

async function readAsTextOrInflate(resp: Response): Promise<string> {
  const contentType = resp.headers.get('content-type') || '';
  const contentEncoding = resp.headers.get('content-encoding') || '';
  // If it's XML/HTML/text, prefer text()
  if (/xml|html|text|json/i.test(contentType) && !/gzip|deflate|br/i.test(contentEncoding)) {
    return await resp.text();
  }
  // Otherwise attempt to read as arrayBuffer and gunzip if needed
  const buf = new Uint8Array(await resp.arrayBuffer());
  try {
    if (/gzip|application\/octet-stream|binary/i.test(contentEncoding + ' ' + contentType)) {
      const { ungzip } = await import('pako');
      const out = ungzip(buf);
      return new TextDecoder('utf-8').decode(out);
    }
  } catch {}
  // Fallback: try to decode raw bytes as UTF-8
  return new TextDecoder('utf-8').decode(buf);
}

export async function fetchTextWithCorsFallback(url: string): Promise<string> {
  const proxied = buildProxyUrl(url);
  if (isCorsBlocked()) {
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await readAsTextOrInflate(resp);
  }
  try {
    const res = await fetch(url);
    if (res.ok) return await readAsTextOrInflate(res);
    // Non-OK response but direct fetch succeeded; fallback without marking blocked
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await readAsTextOrInflate(resp);
  } catch (_err) {
    // Direct fetch threw (likely CORS). Remember and always use proxy next time.
    rememberCorsBlocked();
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await readAsTextOrInflate(resp);
  }
}

