import { invoke } from "@tauri-apps/api/core";
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";
import { Download, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { useToast } from "@/hooks/useToast";
import type { Article } from "@/lib/types";

function WikiLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
	if (href?.startsWith("/wiki/")) {
		return (
			<Link to={href} className="text-primary underline">
				{children}
			</Link>
		);
	}
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" {...props}>
			{children}
		</a>
	);
}

function extractHeadings(markdown: string) {
	const headings: { depth: number; text: string; id: string }[] = [];
	for (const line of markdown.split("\n")) {
		const match = line.match(/^(#{1,6})\s+(.+)/);
		if (match) {
			const text = match[2].trim();
			headings.push({
				depth: match[1].length,
				text,
				id: text.replace(/ /g, "-").toLowerCase(),
			});
		}
	}
	return headings;
}

export function Reader() {
	const { slug } = useParams<{ slug: string }>();
	const { data: article, loading } = useTauriCommand<Article>("read_article", {
		slug: slug ?? "",
	});
	const { data: backlinks } = useTauriCommand<string[]>("get_backlinks", {
		slug: slug ?? "",
	});

	const { toast } = useToast();
	const [exportOpen, setExportOpen] = useState(false);

	async function handleExport(format: string) {
		if (!slug) return;
		setExportOpen(false);
		try {
			const result = await invoke<{ path: string; format: string }>(
				"export_article",
				{ slug, format },
			);
			toast({ title: "Exported", description: "Saved to " + result.path, type: "success" });
		} catch (err) {
			toast({ title: "Export failed", description: String(err), type: "error" });
		}
	}

	if (!slug) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
				Select an article from the sidebar
			</div>
		);
	}

	if (loading) {
		return (
			<div className="max-w-3xl mx-auto px-8 py-10">
				<Skeleton className="h-10 w-3/4 mb-4" />
				<div className="flex gap-2 mb-8">
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-5 w-20 rounded-full" />
				</div>
				<div className="space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-4/6" />
				</div>
			</div>
		);
	}

	if (!article) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground text-sm">
				Article not found: {slug}
			</div>
		);
	}

	const headings = extractHeadings(article.body);

	return (
		<div className="flex h-full">
			<ScrollArea className="flex-1">
				<article className="max-w-3xl mx-auto px-8 py-10">
					<header className="mb-10 pb-6 border-b">
						<div className="flex items-start justify-between mb-3">
							<h1 className="text-2xl font-bold tracking-tight leading-tight">
								{article.title}
							</h1>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-foreground shrink-0 ml-4"
								onClick={() => invoke("open_in_editor", { slug })}
							>
								<Pencil className="h-4 w-4" />
								Edit
							</Button>
							<div className="relative shrink-0 ml-2">
								<Button
									variant="ghost"
									size="sm"
									className="text-muted-foreground hover:text-foreground"
									onClick={() => setExportOpen(!exportOpen)}
								>
									<Download className="h-4 w-4" />
									Export
								</Button>
								{exportOpen && (
									<div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md py-1 z-10 min-w-[160px]">
										<button
											type="button"
											className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
											onClick={() => handleExport("markdown")}
										>
											Markdown Report
										</button>
										<button
											type="button"
											className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
											onClick={() => handleExport("marp")}
										>
											Marp Slides
										</button>
									</div>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2 text-xs">
							<span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-green-700 dark:text-green-400 font-medium">
								{article.status}
							</span>
							{article.categories.map((cat) => (
								<span
									key={cat}
									className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-blue-700 dark:text-blue-400 font-medium"
								>
									{cat}
								</span>
							))}
							{article.updated && (
								<span className="text-muted-foreground">
									Updated {article.updated}
								</span>
							)}
						</div>
					</header>

					<div
						className="prose prose-neutral dark:prose-invert prose-sm max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-muted prose-pre:border prose-pre:border-border"
					>
						<ReactMarkdown
							remarkPlugins={[
								remarkGfm,
								[
									remarkWikiLink,
									{
										hrefTemplate: (permalink: string) => `/wiki/${permalink}`,
										pageResolver: (name: string) => [
											name.replace(/ /g, "-").toLowerCase(),
										],
										aliasDivider: "|",
									},
								],
							]}
							rehypePlugins={[rehypeHighlight, rehypeSlug]}
							components={{ a: WikiLink }}
						>
							{article.body}
						</ReactMarkdown>
					</div>

					{article.sources.length > 0 && (
						<div className="mt-10 pt-6 border-t">
							<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Sources
							</p>
							<ul className="space-y-1">
								{article.sources.map((src) => (
									<li
										key={src}
										className="text-xs text-muted-foreground font-mono"
									>
										{src}
									</li>
								))}
							</ul>
						</div>
					)}

					{(backlinks ?? []).length > 0 && (
						<div className="mt-6 pt-6 border-t">
							<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Backlinks
							</p>
							<div className="flex flex-wrap gap-1.5">
								{backlinks?.map((bl) => (
									<Link
										key={bl}
										to={`/wiki/${bl}`}
										className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
									>
										{bl}
									</Link>
								))}
							</div>
						</div>
					)}
				</article>
			</ScrollArea>

			{headings.length > 2 && (
				<aside className="w-52 shrink-0 border-l hidden lg:block">
					<div className="sticky top-0 p-4 pt-8">
						<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
							On this page
						</p>
						<nav className="space-y-0.5">
							{headings.map((h) => (
								<a
									key={h.id}
									href={`#${h.id}`}
									className="block text-[12px] text-muted-foreground hover:text-foreground transition-colors py-0.5 leading-snug"
									style={{ paddingLeft: `${(h.depth - 1) * 12}px` }}
								>
									{h.text}
								</a>
							))}
						</nav>
					</div>
				</aside>
			)}

		</div>
	);
}
