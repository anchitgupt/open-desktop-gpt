import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { ArticleMeta } from "@/lib/types";

export function Sidebar() {
  const location = useLocation();
  const { data: articles } = useTauriCommand<ArticleMeta[]>("list_articles");
  const { data: uncompiled } = useTauriCommand<string[]>("list_uncompiled");

  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/qa", label: "Q&A" },
  ];

  const grouped = new Map<string, ArticleMeta[]>();
  for (const article of articles ?? []) {
    const cat = article.categories[0] ?? "Uncategorized";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(article);
  }

  return (
    <aside className="w-60 border-r flex flex-col">
      <div className="p-4">
        <h1 className="text-lg font-bold">Knowledge GPT</h1>
      </div>
      <Separator />
      <nav className="p-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
              location.pathname === item.to
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
          <span>Uncompiled</span>
          <Badge variant="secondary">{uncompiled?.length ?? 0}</Badge>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-2">
        {grouped.size === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No articles yet</p>
        ) : (
          Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat} className="mb-3">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
                {cat}
              </p>
              {items.map((article) => (
                <Link
                  key={article.slug}
                  to={`/wiki/${article.slug}`}
                  className={`block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                    location.pathname === `/wiki/${article.slug}`
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground"
                  }`}
                >
                  {article.title}
                </Link>
              ))}
            </div>
          ))
        )}
      </ScrollArea>
    </aside>
  );
}
