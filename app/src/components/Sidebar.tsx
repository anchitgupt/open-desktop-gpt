import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { useFileWatcher } from "@/hooks/useFileWatcher";
import { useTheme } from "@/hooks/useTheme";
import type { ArticleMeta } from "@/lib/types";
import { IngestDialog } from "./IngestDialog";
import { SettingsDialog } from "./SettingsDialog";
import { UncompiledList } from "./UncompiledList";

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

  const { theme, setTheme } = useTheme();
  const [showUncompiled, setShowUncompiled] = useState(false);
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
        <button
          onClick={() => setShowUncompiled(!showUncompiled)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-md"
        >
          <span>Uncompiled</span>
          <Badge variant="secondary">{uncompiled?.length ?? 0}</Badge>
        </button>
        {showUncompiled && uncompiled && (
          <div className="mt-1">
            <UncompiledList
              paths={uncompiled}
              onCompiled={() => {
                refetchArticlesRef.current();
                refetchUncompiledRef.current();
              }}
            />
          </div>
        )}
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
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          )}
        </button>
      </div>
    </aside>
  );
}
