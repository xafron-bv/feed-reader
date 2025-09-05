export function extractFaviconFromHtml(html: string, baseUrl: string): string | undefined {
  const relIconRegex = /<link[^>]+rel=["']?([^"'>]+)["']?[^>]*href=["']([^"']+)["'][^>]*>/gi;
  const candidates: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = relIconRegex.exec(html))) {
    const relValue = match[1]?.toLowerCase() || '';
    const hrefValue = match[2];
    if (!hrefValue) continue;
    if (/(^|\s)(icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)(\s|$)/.test(relValue)) {
      candidates.push(hrefValue);
    }
  }
  const href = candidates[0] || '/favicon.ico';
  try {
    const url = new URL(href, baseUrl);
    return url.toString();
  } catch {
    return undefined;
  }
}

