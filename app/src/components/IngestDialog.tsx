import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type IngestMode = "url" | "file" | "text";

interface IngestDialogProps {
  onIngested: () => void;
  triggerVariant?: "default" | "footer";
}

export function IngestDialog({
  onIngested,
  triggerVariant = "default",
}: IngestDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<IngestMode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function reset() {
    setUrl("");
    setText("");
    setTextTitle("");
    setError(null);
    setLoading(false);
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("ingest_url", { url: url.trim() });
      reset();
      setOpen(false);
      onIngested();
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  async function handleFilePick() {
    setLoading(true);
    setError(null);
    try {
      const selected = await openFileDialog({
        multiple: true,
        filters: [
          { name: "Documents", extensions: ["md", "txt", "pdf", "markdown"] },
          { name: "Data", extensions: ["csv", "json", "jsonl"] },
          { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "svg", "webp"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (!selected) {
        setLoading(false);
        return;
      }
      const paths = Array.isArray(selected) ? selected : [selected];
      for (const filePath of paths) {
        await invoke("ingest_file", { path: filePath });
      }
      reset();
      setOpen(false);
      onIngested();
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("ingest_text", {
        title: textTitle.trim() || "Untitled Note",
        content: text.trim(),
      });
      reset();
      setOpen(false);
      onIngested();
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  const modes: { id: IngestMode; label: string }[] = [
    { id: "url", label: "URL" },
    { id: "file", label: "File" },
    { id: "text", label: "Text" },
  ];

  const triggerElement =
    triggerVariant === "footer" ? (
      <Button
        variant="ghost"
        size="sm"
        className="px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        + Add source
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full">
        + Add source
      </Button>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) reset();
      }}
    >
      <DialogTrigger render={triggerElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex border-b mb-4">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setError(null); }}
              className={`px-3 py-2 text-xs font-medium transition-colors relative ${
                mode === m.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
              {mode === m.id && (
                <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* URL mode */}
        {mode === "url" && (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !url.trim()} className="w-full">
              {loading ? "Ingesting..." : "Ingest URL"}
            </Button>
          </form>
        )}

        {/* File mode */}
        {mode === "file" && (
          <div className="space-y-4">
            <button
              onClick={handleFilePick}
              disabled={loading}
              className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-foreground/20 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-muted-foreground"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
              <p className="text-sm font-medium text-muted-foreground">
                {loading ? "Uploading..." : "Click to select files"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Supports .md, .pdf, .txt, .csv, .json, images
              </p>
            </button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        {/* Text mode */}
        {mode === "text" && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div>
              <Label htmlFor="text-title">Title</Label>
              <Input
                id="text-title"
                placeholder="Note title (optional)"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="text-content">Content</Label>
              <textarea
                id="text-content"
                placeholder="Paste or type your content here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                rows={8}
                className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !text.trim()} className="w-full">
              {loading ? "Adding..." : "Add to Knowledge Base"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
