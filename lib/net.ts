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

export async function fetchTextWithCorsFallback(url: string): Promise<string> {
  const proxied = buildProxyUrl(url);
  if (isCorsBlocked()) {
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await resp.text();
  }
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
    // Non-OK response but direct fetch succeeded; fallback without marking blocked
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await resp.text();
  } catch (_err) {
    // Direct fetch threw (likely CORS). Remember and always use proxy next time.
    rememberCorsBlocked();
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await resp.text();
  }
}

