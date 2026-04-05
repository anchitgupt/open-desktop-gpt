import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { useFileWatcher } from "@/hooks/useFileWatcher";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { useTheme } from "@/hooks/useTheme";
import type { ArticleMeta, WikiStats } from "@/lib/types";
import { IngestDialog } from "./IngestDialog";
import { SettingsDialog } from "./SettingsDialog";
import { SidebarBrowseTab } from "./SidebarBrowseTab";
import { SidebarSearchTab } from "./SidebarSearchTab";

type TabId = "browse" | "search";

export function Sidebar() {
	const location = useLocation();
	const [activeTab, setActiveTab] = useState<TabId>("browse");
	const [collapsed, setCollapsed] = useState(() => {
		try {
			return localStorage.getItem("sidebar-collapsed") === "true";
		} catch {
			return false;
		}
	});
	const { theme, setTheme } = useTheme();

	const { data: articles, loading: articlesLoading, refetch: refetchArticles } =
		useTauriCommand<ArticleMeta[]>("list_articles");
	const { data: uncompiled, refetch: refetchUncompiled } =
		useTauriCommand<string[]>("list_uncompiled");
	const { data: stats, refetch: refetchStats } = useTauriCommand<WikiStats>("get_stats");

	// Use refs so the stable handleFileChange callback always calls the latest refetch
	const refetchArticlesRef = useRef(refetchArticles);
	refetchArticlesRef.current = refetchArticles;
	const refetchUncompiledRef = useRef(refetchUncompiled);
	refetchUncompiledRef.current = refetchUncompiled;
	const refetchStatsRef = useRef(refetchStats);
	refetchStatsRef.current = refetchStats;

	useEffect(() => {
		localStorage.setItem("sidebar-collapsed", String(collapsed));
	}, [collapsed]);

	const handleFileChange = useCallback(() => {
		refetchArticlesRef.current();
		refetchUncompiledRef.current();
		refetchStatsRef.current();
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
		{ to: "/inbox", label: "Sources" },
	];

	const tabs: { id: TabId; label: string }[] = [
		{ id: "browse", label: "Browse" },
		{ id: "search", label: "Search" },
	];

	const uncompiledCount = uncompiled?.length ?? 0;

	const tabContent = {
		browse: (
			<SidebarBrowseTab
				articles={articles ?? []}
				currentPath={location.pathname}
				loading={articlesLoading}
			/>
		),
		search: (
			<SidebarSearchTab
				articles={articles ?? []}
				currentPath={location.pathname}
			/>
		),
	};

	return (
		<aside className={`${collapsed ? "w-14" : "w-64"} border-r flex flex-col bg-background transition-all duration-200`}>
			{/* Header */}
			<div className="px-3 pt-4 pb-3 flex items-center gap-2.5">
				<button
					type="button"
					onClick={() => setCollapsed(!collapsed)}
					className="p-1.5 rounded-md hover:bg-accent text-muted-foreground shrink-0 transition-colors"
					title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					<motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="m15 18-6-6 6-6" />
						</svg>
					</motion.div>
				</button>
				{!collapsed && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.15, delay: 0.05 }}
					>
						<h1 className="text-[13px] font-semibold tracking-tight leading-tight">Open Desktop GPT</h1>
						<p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
							{stats?.article_count ?? 0} articles · {(stats?.total_words ?? 0).toLocaleString()} words
						</p>
					</motion.div>
				)}
			</div>

			{/* Nav */}
			{!collapsed && (
				<nav className="px-2 pb-2 space-y-0.5">
					{navItems.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors text-muted-foreground hover:text-foreground"
						>
							{location.pathname === item.to && (
								<motion.div
									layoutId="nav-indicator"
									className="absolute inset-0 rounded-lg bg-accent"
									transition={{ type: "spring", stiffness: 400, damping: 30 }}
								/>
							)}
							<span className={`relative z-10 ${location.pathname === item.to ? "font-medium text-accent-foreground" : ""}`}>
								{item.label}
							</span>
							{item.to === "/inbox" && uncompiledCount > 0 && (
								<span className="relative z-10 ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
									{uncompiledCount}
								</span>
							)}
						</Link>
					))}
				</nav>
			)}

			{/* Separator */}
			{!collapsed && <div className="mx-3 border-t border-border/60" />}

			{/* Tab bar */}
			{!collapsed && (
				<div className="flex px-3 pt-2 pb-0 gap-1">
					{tabs.map((tab) => (
						<button
							type="button"
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all relative ${
								activeTab === tab.id
									? "text-foreground bg-accent/60"
									: "text-muted-foreground hover:text-foreground hover:bg-accent/30"
							}`}
						>
							<span className="relative z-10 flex items-center justify-center gap-1">
								{tab.label}
							</span>
						</button>
					))}
				</div>
			)}

			{/* Tab content with animated transitions */}
			{!collapsed && (
				<div className="flex-1 overflow-hidden mt-1">
					<AnimatePresence mode="wait">
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
							className="h-full"
						>
							{tabContent[activeTab]}
						</motion.div>
					</AnimatePresence>
				</div>
			)}

			{/* Footer */}
			{!collapsed && (
				<div className="px-3 py-2.5 border-t border-border/60 flex items-center justify-between">
					<SettingsDialog />
					<IngestDialog onIngested={handleRefresh} triggerVariant="footer" />
					<button
						type="button"
						onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors"
						title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
					>
						<AnimatePresence mode="wait">
							{theme === "dark" ? (
								<motion.div key="sun" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
									<Sun className="h-4 w-4" />
								</motion.div>
							) : (
								<motion.div key="moon" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.2 }}>
									<Moon className="h-4 w-4" />
								</motion.div>
							)}
						</AnimatePresence>
					</button>
				</div>
			)}
		</aside>
	);
}
