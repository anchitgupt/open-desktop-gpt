import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { useFileWatcher } from "@/hooks/useFileWatcher";
import type { ArticleMeta } from "@/lib/types";
import { IngestDialog } from "./IngestDialog";
import { SettingsDialog } from "./SettingsDialog";

export function Sidebar() {
  const location = useLocation();
  const { data: articles, refetch: refetchArticles } = useTauriCommand<ArticleMeta[]>("list_articles");
  const { data: uncompiled, refetch: refetchUncompiled } = useTauriCommand<string[]>("list_uncompiled");

  // Use refs so the stable handleFileChange callback always calls the latest refetch
  const refetchArticlesRef = useRef(refetchArticles);
  refetchArticlesRef.current = refetchArticles;
  const refetchUncompiledRef = useRef(refetchUncompiled);
  refetchUncompiledRef.current = refetchUncompiled;

  const handleFileChange = useCallback(() => {
    refetchArticlesRef.current();
    refetchUncompiledRef.current();
  }, []);

  useFileWatcher(handleFileChange);

  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      try {
        await invoke("ingest_file", { path: (file as any).path });
      } catch (err) {
        console.error("Ingest failed:", err);
      }
    }
  }, []);

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
      <div className="p-2">
        <IngestDialog onIngested={() => window.location.reload()} />
      </div>
      <div
        className={`mx-2 mb-2 border-2 border-dashed rounded-md p-3 text-center text-xs text-muted-foreground transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        Drop files here
      </div>
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
      <Separator />
      <div className="p-2 flex items-center justify-between">
        <SettingsDialog />
      </div>
    </aside>
  );
}
