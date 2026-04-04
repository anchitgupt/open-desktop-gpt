import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SearchResult } from "@/lib/types";

interface SidebarSearchTabProps {
	articles: any[]; // keep for fallback
	currentPath: string;
}

export function SidebarSearchTab({ currentPath }: SidebarSearchTabProps) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [searching, setSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useEffect(() => {
		if (!query.trim()) {
			setResults([]);
			return;
		}

		if (debounceRef.current !== undefined) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(async () => {
			setSearching(true);
			try {
				const res = await invoke<SearchResult[]>("search_articles", {
					query: query.trim(),
				});
				setResults(res);
			} catch {
				setResults([]);
			}
			setSearching(false);
		}, 300);

		return () => {
			if (debounceRef.current !== undefined) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [query]);

	return (
		<div className="flex flex-col h-full">
			<div className="p-2">
				<input
					className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
					placeholder="Search wiki..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
			</div>
			<ScrollArea className="flex-1">
				<div className="px-2 py-1">
					{searching && (
						<p className="px-3 py-2 text-xs text-muted-foreground">
							Searching...
						</p>
					)}
					{!searching &&
						results.length > 0 &&
						results.map((r) => (
							<Link
								key={r.slug}
								to={`/wiki/${r.slug}`}
								className={`block rounded-md px-3 py-2 transition-colors hover:bg-accent/50 ${
									currentPath === `/wiki/${r.slug}` ? "bg-accent" : ""
								}`}
							>
								<p className="text-sm font-medium truncate">{r.title}</p>
								<p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
									{r.snippet}
								</p>
							</Link>
						))}
					{!searching && query.trim() && results.length === 0 && (
						<div className="px-3 py-4 text-center">
							<p className="text-xs text-muted-foreground mb-2">
								No results for "{query}"
							</p>
							<Link
								to={`/qa?q=${encodeURIComponent(query)}`}
								className="text-xs text-blue-500 hover:underline"
							>
								Ask in Q&A →
							</Link>
						</div>
					)}
					{!query.trim() && (
						<p className="px-3 py-4 text-xs text-muted-foreground text-center">
							Type to search your wiki
						</p>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
