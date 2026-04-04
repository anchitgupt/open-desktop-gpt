import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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

interface IngestDialogProps {
  onIngested: () => void;
  /**
   * Controls the trigger button appearance:
   * - "default": full-width "Paste URL" button (original behaviour)
   * - "footer": compact "Add source" ghost button for the sidebar footer
   */
  triggerVariant?: "default" | "footer";
}

export function IngestDialog({
  onIngested,
  triggerVariant = "default",
}: IngestDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("ingest_url", { url: url.trim() });
      setUrl("");
      setOpen(false);
      onIngested();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

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
        + Paste URL
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ingest URL</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? "Ingesting..." : "Ingest"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
