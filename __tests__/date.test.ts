import { describe, it, expect } from '@jest/globals';
import { convertDateStringToDate, formatRelativeFromNow } from '@/lib/date';

describe('date utils', () => {
  it('parses ISO date', () => {
    const d = convertDateStringToDate('2025-01-01T12:00:00.000Z');
    expect(d).toBeInstanceOf(Date);
  });

  it('formats relative time', () => {
    const rel = formatRelativeFromNow(new Date().toISOString());
    expect(typeof rel).toBe('string');
  });
});

