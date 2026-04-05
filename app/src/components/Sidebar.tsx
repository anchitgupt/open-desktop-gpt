import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useFileWatcher } from "@/hooks/useFileWatcher";
import { useTauriCommand } from "@/hooks/useTauriCommand";
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
	const [collapsed, setCollapsed] = useState(false);
	const { theme, setTheme } = useTheme();

	const { data: articles, loading: articlesLoading, refetch: refetchArticles } =
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
		<aside className={`${collapsed ? "w-14" : "w-64"} border-r flex flex-col bg-background transition-all duration-200`}>
			{/* Header */}
			<div className="px-2 pt-3 pb-2 flex items-center gap-2">
				<button
					type="button"
					onClick={() => setCollapsed(!collapsed)}
					className="p-1.5 rounded-md hover:bg-accent text-muted-foreground shrink-0"
					title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						{collapsed ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
					</svg>
				</button>
				{!collapsed && (
					<div>
						<h1 className="text-sm font-semibold tracking-tight">Open Desktop GPT</h1>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							{stats?.article_count ?? 0} articles · {(stats?.total_words ?? 0).toLocaleString()} words
						</p>
					</div>
				)}
			</div>

			{/* Nav */}
			{!collapsed && (
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
			)}

			{/* Tab bar */}
			{!collapsed && (
				<div className="flex border-b px-2">
					{tabs.map((tab) => (
						<button
							type="button"
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
			)}

			{/* Tab content */}
			{!collapsed && (
				<div className="flex-1 overflow-hidden">
					{activeTab === "browse" && (
						<SidebarBrowseTab
							articles={articles ?? []}
							currentPath={location.pathname}
							loading={articlesLoading}
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
			)}

			{/* Footer */}
			{!collapsed && (
				<div className="px-2 py-2 border-t flex items-center justify-between">
					<SettingsDialog />
					<IngestDialog onIngested={handleRefresh} triggerVariant="footer" />
					<button
						type="button"
						onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						className="p-2 rounded-md hover:bg-accent text-muted-foreground"
						title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
					>
						{theme === "dark" ? (
							<svg role="img" aria-label="icon">
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
							<svg role="img" aria-label="icon">
								<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
							</svg>
						)}
					</button>
				</div>
			)}
		</aside>
	);
}
