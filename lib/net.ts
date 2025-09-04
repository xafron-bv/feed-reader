export async function fetchTextWithCorsFallback(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
    throw new Error(`HTTP ${res.status}`);
  } catch (_err) {
    const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxied);
    if (!resp.ok) throw new Error('Failed to fetch feed');
    return await resp.text();
  }
}

