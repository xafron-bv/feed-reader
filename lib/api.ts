// Placeholder for future bookmark sync API. Not implemented now.
export type SyncService = {
  syncBookmarks?: (bookmarkedArticleIds: string[]) => Promise<void>;
};

export const NoopSyncService: SyncService = {
  syncBookmarks: async () => {},
};

// For future use: wire up a real service here
export function getSyncService(): SyncService {
  return NoopSyncService;
}

