import { useParams, Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="p-6 text-muted-foreground">Select an article from the sidebar.</div>
    );
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  if (!article) {
    return <div className="p-6 text-muted-foreground">Article not found: {slug}</div>;
  }

  const headings = extractHeadings(article.body);

  return (
    <div className="flex h-full">
      <ScrollArea className="flex-1">
        <article className="max-w-3xl mx-auto px-6 py-8">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => invoke("open_in_editor", { slug })}
              >
                Edit
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{article.status}</Badge>
              {article.categories.map((cat) => (
                <Badge key={cat} variant="secondary">{cat}</Badge>
              ))}
              {article.updated && <span>Updated: {article.updated}</span>}
            </div>
          </header>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
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
            <footer className="mt-8 pt-4 border-t text-sm text-muted-foreground">
              <p className="font-medium mb-2">Sources:</p>
              <ul className="list-disc pl-5">
                {article.sources.map((src) => (
                  <li key={src}>{src}</li>
                ))}
              </ul>
            </footer>
          )}

          {(backlinks ?? []).length > 0 && (
            <div className="mt-6 pt-4 border-t text-sm">
              <p className="font-medium mb-2 text-muted-foreground">Backlinks:</p>
              <div className="flex flex-wrap gap-2">
                {backlinks!.map((bl) => (
                  <Link key={bl} to={`/wiki/${bl}`} className="text-primary underline text-sm">
                    {bl}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </ScrollArea>

      {headings.length > 2 && (
        <aside className="w-48 border-l p-4 hidden lg:block">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">On this page</p>
          <nav className="space-y-1">
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                style={{ paddingLeft: `${(h.depth - 1) * 8}px` }}
              >
                {h.text}
              </a>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}
