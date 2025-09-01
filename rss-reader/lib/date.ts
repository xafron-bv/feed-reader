export function convertDateStringToDate(input?: string): Date | undefined {
  if (!input) return undefined;
  // Try native Date parsing first
  const parsedNative = new Date(input);
  if (!isNaN(parsedNative.getTime())) return parsedNative;

  // Try common RSS date formats
  const formats = [
    "EEE, dd MMM yyyy HH:mm:ss xxx", // RFC 2822 with timezone
    "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    "yyyy-MM-dd'T'HH:mm:ssxxx",
    "yyyy-MM-dd HH:mm:ss xxx",
  ];
  for (const _format of formats) {
    // Minimal manual attempts: replace Z without colon, etc.
    try {
      const normalized = input
        .replace(/\s+UT$/i, " GMT")
        .replace(/(\+|\-)\d{2}(\d{2})$/, (m) => m.slice(0, 3) + ":" + m.slice(3));
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) return date;
    } catch {
      // ignore
    }
  }
  return undefined;
}

export function toIsoStringOrUndefined(date?: Date): string | undefined {
  return date ? date.toISOString() : undefined;
}

export function formatRelativeFromNow(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 45) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 45) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHour) < 22) return rtf.format(diffHour, "hour");
  return rtf.format(diffDay, "day");
}

