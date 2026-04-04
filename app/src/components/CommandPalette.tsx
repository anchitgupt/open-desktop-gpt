import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { ArticleMeta } from "@/lib/types";

export function CommandPalette() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const navigate = useNavigate();
	const { data: articles } = useTauriCommand<ArticleMeta[]>("list_articles");

	// Global Cmd+K / Ctrl+K listener
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	const filtered = (articles ?? []).filter(
		(a) =>
			a.title.toLowerCase().includes(query.toLowerCase()) ||
			a.categories.some((c) => c.toLowerCase().includes(query.toLowerCase())),
	);

	// Reset selection when query changes
	useEffect(() => setSelectedIndex(0), []);

	function handleSelect(slug: string) {
		setOpen(false);
		setQuery("");
		setSelectedIndex(0);
		navigate(`/wiki/${slug}`);
	}

	function handleAskInQA() {
		setOpen(false);
		navigate(`/qa?q=${encodeURIComponent(query)}`);
		setQuery("");
		setSelectedIndex(0);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (query.trim() && filtered.length > 0) {
				setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
			} else if (!query.trim()) {
				// Dashboard = 0, Q&A = 1
				setSelectedIndex((prev) => Math.min(prev + 1, 1));
			}
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((prev) => Math.max(prev - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (query.trim()) {
				if (filtered.length > 0) {
					handleSelect(filtered[selectedIndex].slug);
				} else {
					handleAskInQA();
				}
			} else {
				// Quick actions: 0 = Dashboard, 1 = Q&A
				if (selectedIndex === 0) {
					setOpen(false);
					navigate("/");
				} else {
					setOpen(false);
					navigate("/qa");
				}
			}
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen);
				if (!isOpen) {
					setQuery("");
					setSelectedIndex(0);
				}
			}}
		>
			<DialogContent
				className="p-0 max-w-md overflow-hidden rounded-xl"
				showCloseButton={false}
			>
				{/* Search input row */}
				<div className="p-3">
					<div className="flex items-center gap-2">
						<svg role="img" aria-label="icon">
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.3-4.3" />
						</svg>
						<input
							placeholder="Search articles or ask a question..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							autoFocus
							className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none"
						/>
						<kbd className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded font-mono">
							ESC
						</kbd>
					</div>
				</div>

				{/* Results area */}
				<div className="max-h-80 overflow-auto border-t">
					{query.trim() ? (
						filtered.length > 0 ? (
							<>
								{/* Section header */}
								<div className="px-3 pt-2 pb-1">
									<p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
										Articles
									</p>
								</div>
								<div className="p-2">
									{filtered.map((article, index) => (
										<button
											type="button"
											key={article.slug}
											className={`w-full text-left rounded-md px-3 py-2 text-sm flex items-center justify-between transition-colors ${
												index === selectedIndex
													? "bg-accent"
													: "hover:bg-accent/50"
											}`}
											onClick={() => handleSelect(article.slug)}
											onMouseEnter={() => setSelectedIndex(index)}
										>
											<div className="flex items-center gap-2 min-w-0">
												<svg role="img" aria-label="icon">
													<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
													<path d="M14 2v4a2 2 0 0 0 2 2h4" />
												</svg>
												<span className="truncate">{article.title}</span>
											</div>
											<span className="text-[11px] text-muted-foreground/60 shrink-0 ml-2">
												{article.categories[0] ?? ""}
											</span>
										</button>
									))}
								</div>
							</>
						) : (
							/* No results — offer Ask in Q&A */
							<div className="p-2">
								<button
									type="button"
									className={`w-full text-left rounded-md px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
										selectedIndex === 0 ? "bg-accent" : "hover:bg-accent/50"
									}`}
									onClick={handleAskInQA}
									onMouseEnter={() => setSelectedIndex(0)}
								>
									<svg role="img" aria-label="icon">
										<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
									</svg>
									<span>
										Ask &ldquo;<span className="font-medium">{query}</span>
										&rdquo; in Q&amp;A
									</span>
								</button>
							</div>
						)
					) : (
						/* Empty query — Quick Actions */
						<div className="p-2">
							<p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
								Quick Actions
							</p>
							<button
								type="button"
								className={`w-full text-left rounded-md px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
									selectedIndex === 0 ? "bg-accent" : "hover:bg-accent/50"
								}`}
								onClick={() => {
									setOpen(false);
									navigate("/");
								}}
								onMouseEnter={() => setSelectedIndex(0)}
							>
								<svg role="img" aria-label="icon">
									<rect width="7" height="9" x="3" y="3" rx="1" />
									<rect width="7" height="5" x="14" y="3" rx="1" />
									<rect width="7" height="9" x="14" y="12" rx="1" />
									<rect width="7" height="5" x="3" y="16" rx="1" />
								</svg>
								Dashboard
							</button>
							<button
								type="button"
								className={`w-full text-left rounded-md px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
									selectedIndex === 1 ? "bg-accent" : "hover:bg-accent/50"
								}`}
								onClick={() => {
									setOpen(false);
									navigate("/qa");
								}}
								onMouseEnter={() => setSelectedIndex(1)}
							>
								<svg role="img" aria-label="icon">
									<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
								</svg>
								Open Q&amp;A
							</button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
