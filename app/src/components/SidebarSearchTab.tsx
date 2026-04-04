import { useState } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ArticleMeta } from "@/lib/types";

interface SidebarSearchTabProps {
  articles: ArticleMeta[];
  currentPath: string;
}

export function SidebarSearchTab({ articles, currentPath }: SidebarSearchTabProps) {
  const [query, setQuery] = useState("");

  const trimmed = query.trim();

  const filtered = trimmed
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(trimmed.toLowerCase()) ||
          a.categories.some((c) => c.toLowerCase().includes(trimmed.toLowerCase()))
      )
    : [];

  const grouped = new Map<string, ArticleMeta[]>();
  for (const article of filtered) {
    const cat = article.categories[0] ?? "Uncategorized";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(article);
  }

  const hasQuery = trimmed.length > 0;
  const hasResults = grouped.size > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-2">
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          type="text"
          placeholder="Search articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-[border-color,box-shadow]"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {!hasQuery && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              Type to search articles
            </p>
          )}

          {hasQuery && !hasResults && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-xs text-muted-foreground">No matches for "{trimmed}"</p>
              <Link
                to={`/qa?q=${encodeURIComponent(trimmed)}`}
                className="text-xs text-primary hover:underline underline-offset-4"
              >
                Ask in Q&amp;A →
              </Link>
            </div>
          )}

          {hasResults &&
            Array.from(grouped.entries()).map(([cat, items]) => (
              <div key={cat} className="mb-3">
                <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {cat}
                </p>
                {items.map((article) => (
                  <Link
                    key={article.slug}
                    to={`/wiki/${article.slug}`}
                    className={`block rounded-md px-3 py-1.5 text-sm transition-colors truncate ${
                      currentPath === `/wiki/${article.slug}`
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-foreground hover:bg-accent/50"
                    }`}
                    title={article.title}
                  >
                    {article.title}
                  </Link>
                ))}
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
