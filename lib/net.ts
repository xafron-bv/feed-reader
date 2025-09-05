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

function looksLikeXmlOrHtml(s: string): boolean {
  const t = (s || '').trimStart();
  return t.startsWith('<');
}

async function readAsTextOrInflate(resp: Response): Promise<string> {
  const contentType = resp.headers.get('content-type') || '';
  const contentEncoding = resp.headers.get('content-encoding') || '';
  // First try plain text via clone (works when browser auto-decompressed)
  try {
    const pre = await resp.clone().text();
    if (looksLikeXmlOrHtml(pre)) return pre;
  } catch {}
  // Always read bytes; detect gzip/deflate by magic or headers, else decode as UTF-8
  const buf = new Uint8Array(await resp.arrayBuffer());
  const looksGzip = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const looksZlib = buf.length > 2 && buf[0] === 0x78 && (buf[1] === 0x01 || buf[1] === 0x9c || buf[1] === 0xda);
  const hintedGzip = /gzip/i.test(contentEncoding) || /application\/gzip/i.test(contentType);
  const hintedDeflate = /deflate/i.test(contentEncoding);
  if (looksGzip || hintedGzip) {
    try {
      const { ungzip } = await import('pako');
      const out = ungzip(buf);
      return new TextDecoder('utf-8').decode(out);
    } catch {}
  }
  if (looksZlib || hintedDeflate) {
    try {
      const { inflate } = await import('pako');
      const out = inflate(buf);
      return new TextDecoder('utf-8').decode(out);
    } catch {}
  }
  // If headers clearly indicate text, return string as UTF-8
  if (/xml|html|text|json/i.test(contentType) && !/br|deflate/i.test(contentEncoding)) {
    try { return new TextDecoder('utf-8').decode(buf); } catch {}
  }
  // Last resort: try resp.text() (may work if browser transparently decoded)
  try { return await resp.text(); } catch {}
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

