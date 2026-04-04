export interface ArticleMeta {
  slug: string;
  title: string;
  categories: string[];
  status: string;
  word_count: number;
  updated: string;
}

export interface Article {
  slug: string;
  title: string;
  categories: string[];
  status: string;
  updated: string;
  sources: string[];
  body: string;
}

export interface WikiStats {
  article_count: number;
  total_words: number;
  categories: CategoryCount[];
  orphans: string[];
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface SearchResult {
  slug: string;
  title: string;
  snippet: string;
  score: number;
}
