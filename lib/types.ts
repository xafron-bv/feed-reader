export type Article = {
  id: string;
  feedId: string;
  title: string;
  content: string;
  link: string;
  pubDate?: string; // ISO string
  image?: string;
};

export type FeedInfo = {
  id: string;
  url: string;
  title?: string;
  description?: string;
  lastBuildDate?: string; // ISO string
};

export type Bookmark = {
  id: string; // article id
  feedId: string;
  createdAt: string; // ISO string
};

export type StoredState = {
  feeds: FeedInfo[];
  bookmarks: Record<string, Bookmark>; // id -> bookmark
  reads: Record<string, ReadMark>; // id -> read mark
};

export type ParsedArticle = {
  title: string;
  content: string;
  link: string;
  pubDate?: Date;
  image?: string;
};

export type ReadMark = {
  id: string; // article id
  feedId: string;
  readAt: string; // ISO string
};

