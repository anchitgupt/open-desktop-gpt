import { useState, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { useFileWatcher } from "@/hooks/useFileWatcher";
import { useTheme } from "@/hooks/useTheme";
import type { ArticleMeta, WikiStats } from "@/lib/types";
import { IngestDialog } from "./IngestDialog";
import { SettingsDialog } from "./SettingsDialog";
import { SidebarBrowseTab } from "./SidebarBrowseTab";
import { SidebarInboxTab } from "./SidebarInboxTab";
import { SidebarSearchTab } from "./SidebarSearchTab";

type TabId = "browse" | "inbox" | "search";

export function Sidebar() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("browse");
  const { theme, setTheme } = useTheme();

  const { data: articles, refetch: refetchArticles } =
    useTauriCommand<ArticleMeta[]>("list_articles");
  const { data: uncompiled, refetch: refetchUncompiled } =
    useTauriCommand<string[]>("list_uncompiled");
  const { data: stats } = useTauriCommand<WikiStats>("get_stats");

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

  const handleRefresh = useCallback(() => {
    refetchArticlesRef.current();
    refetchUncompiledRef.current();
  }, []);

  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/graph", label: "Graph" },
    { to: "/qa", label: "Q&A" },
  ];

  const tabs: { id: TabId; label: string }[] = [
    { id: "browse", label: "Browse" },
    { id: "inbox", label: "Inbox" },
    { id: "search", label: "Search" },
  ];

  const uncompiledCount = uncompiled?.length ?? 0;

  return (
    <aside className="w-64 border-r flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-sm font-semibold tracking-tight">Open Desktop GPT</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {stats?.article_count ?? 0} articles ·{" "}
          {(stats?.total_words ?? 0).toLocaleString()} words
        </p>
      </div>

      {/* Nav */}
      <nav className="px-2 pb-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              location.pathname === item.to
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Tab bar */}
      <div className="flex border-b px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.id === "inbox" && uncompiledCount > 0 && (
              <span className="ml-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                {uncompiledCount}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "browse" && (
          <SidebarBrowseTab
            articles={articles ?? []}
            currentPath={location.pathname}
          />
        )}
        {activeTab === "inbox" && (
          <SidebarInboxTab
            uncompiled={uncompiled ?? []}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === "search" && (
          <SidebarSearchTab
            articles={articles ?? []}
            currentPath={location.pathname}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-2 border-t flex items-center justify-between">
        <SettingsDialog />
        <IngestDialog onIngested={handleRefresh} triggerVariant="footer" />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}
