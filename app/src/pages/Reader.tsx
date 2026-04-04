import { useParams, Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article } from "@/lib/types";
import type { ComponentPropsWithoutRef } from "react";

function WikiLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href?.startsWith("/wiki/")) {
    return <Link to={href} className="text-primary underline">{children}</Link>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
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
  const { data: article, loading } = useTauriCommand<Article>("read_article", { slug: slug ?? "" });
  const { data: backlinks } = useTauriCommand<string[]>("get_backlinks", { slug: slug ?? "" });

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
              <h1 className="text-2xl font-bold tracking-tight leading-tight">{article.title}</h1>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground shrink-0 ml-4"
                onClick={() => invoke("open_in_editor", { slug })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.855z"/></svg>
                Edit
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-green-700 dark:text-green-400 font-medium">
                {article.status}
              </span>
              {article.categories.map((cat) => (
                <span key={cat} className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-blue-700 dark:text-blue-400 font-medium">
                  {cat}
                </span>
              ))}
              {article.updated && (
                <span className="text-muted-foreground">Updated {article.updated}</span>
              )}
            </div>
          </header>

          <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-muted prose-pre:border prose-pre:border-border">
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                [remarkWikiLink, {
                  hrefTemplate: (permalink: string) => `/wiki/${permalink}`,
                  pageResolver: (name: string) => [name.replace(/ /g, "-").toLowerCase()],
                  aliasDivider: "|",
                }],
              ]}
              rehypePlugins={[rehypeHighlight, rehypeSlug]}
              components={{ a: WikiLink }}
            >
              {article.body}
            </ReactMarkdown>
          </div>

          {article.sources.length > 0 && (
            <div className="mt-10 pt-6 border-t">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Sources</p>
              <ul className="space-y-1">
                {article.sources.map((src) => (
                  <li key={src} className="text-xs text-muted-foreground font-mono">{src}</li>
                ))}
              </ul>
            </div>
          )}

          {(backlinks ?? []).length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Backlinks</p>
              <div className="flex flex-wrap gap-1.5">
                {backlinks!.map((bl) => (
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
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">On this page</p>
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
