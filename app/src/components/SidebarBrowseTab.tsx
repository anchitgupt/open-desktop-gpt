import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArticleMeta } from "@/lib/types";

interface SidebarBrowseTabProps {
	articles: ArticleMeta[];
	currentPath: string;
	loading?: boolean;
}

export function SidebarBrowseTab({
	articles,
	currentPath,
	loading,
}: SidebarBrowseTabProps) {
	if (loading) {
		return (
			<div className="px-2 py-2 space-y-2">
				<Skeleton className="h-7 w-full rounded-md" />
				<div className="space-y-1 mt-3">
					<Skeleton className="h-3 w-20 rounded" />
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-7 w-full rounded-md" />
					))}
				</div>
			</div>
		);
	}

	const [filter, setFilter] = useState("");

	const filtered = filter.trim()
		? articles.filter(
				(a) =>
					a.title.toLowerCase().includes(filter.toLowerCase()) ||
					a.categories.some((c) =>
						c.toLowerCase().includes(filter.toLowerCase()),
					),
			)
		: articles;

	const grouped = new Map<string, ArticleMeta[]>();
	for (const article of filtered) {
		const cat = article.categories[0] ?? "Uncategorized";
		if (!grouped.has(cat)) grouped.set(cat, []);
		grouped.get(cat)?.push(article);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="px-2 py-2">
				<input
					type="text"
					placeholder="Filter articles..."
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					className="w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-[border-color,box-shadow]"
				/>
			</div>
			<ScrollArea className="flex-1">
				<div className="px-2 pb-2">
					{grouped.size === 0 ? (
						<p className="px-3 py-4 text-xs text-muted-foreground text-center">
							{filter ? "No matching articles" : "No articles yet"}
						</p>
					) : (
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
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
