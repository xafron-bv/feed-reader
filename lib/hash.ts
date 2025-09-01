export function hashStringToId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  // Convert to unsigned and hex for compactness
  return (hash >>> 0).toString(16);
}

export function feedIdFromUrl(url: string): string {
  return hashStringToId(url.trim().toLowerCase());
}

export function articleIdFromLink(link: string): string {
  return hashStringToId(link.trim());
}

