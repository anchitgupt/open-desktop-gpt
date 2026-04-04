import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { ArticleMeta } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: articles } = useTauriCommand<ArticleMeta[]>("list_articles");

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
      a.categories.some((c) => c.toLowerCase().includes(query.toLowerCase()))
  );

  function handleSelect(slug: string) {
    setOpen(false);
    setQuery("");
    navigate(`/wiki/${slug}`);
  }

  function handleAskInQA() {
    setOpen(false);
    navigate(`/qa?q=${encodeURIComponent(query)}`);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-lg" showCloseButton={false}>
        <div className="p-4">
          <Input
            placeholder="Search articles or ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length === 0 && query.trim()) {
                handleAskInQA();
              }
            }}
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-auto border-t">
          {filtered.length > 0 ? (
            <ul className="p-2">
              {filtered.map((article) => (
                <li key={article.slug}>
                  <button
                    className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-accent flex justify-between"
                    onClick={() => handleSelect(article.slug)}
                  >
                    <span>{article.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {article.categories[0] ?? ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="p-4">
              <button
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground"
                onClick={handleAskInQA}
              >
                Ask "{query}" in Q&A...
              </button>
            </div>
          ) : (
            <div className="p-4">
              <button
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setOpen(false);
                  navigate("/");
                }}
              >
                Go to Dashboard
              </button>
              <button
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground mt-1"
                onClick={() => {
                  setOpen(false);
                  navigate("/qa");
                }}
              >
                Open Q&A
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
