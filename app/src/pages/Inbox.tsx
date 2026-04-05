import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Eye,
  EyeOff,
  File,
  FileText,
  FolderOpen,
  ImageIcon,
  Play,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { IngestDialog } from "@/components/IngestDialog";
import { useToast } from "@/hooks/useToast";

interface RawSource {
  path: string;
  name: string;
  size: number;
  modified: string;
  file_type: string;
  compiled: boolean;
}

interface RawSourceContent {
  content: string;
  is_binary: boolean;
}

type TypeFilter = "all" | "article" | "image" | "data";
type StatusFilter = "all" | "uncompiled" | "compiled";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

function typeIcon(fileType: string) {
  switch (fileType) {
    case "article": return <FileText className="h-4 w-4 text-blue-500" />;
    case "image": return <ImageIcon className="h-4 w-4 text-emerald-500" />;
    case "data": return <Database className="h-4 w-4 text-amber-500" />;
    default: return <File className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusPill(source: RawSource) {
  if (source.file_type === "image") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Media</span>;
  }
  if (source.compiled) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 font-medium">Compiled</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-medium">Uncompiled</span>;
}

export function Inbox() {
  const { toast } = useToast();
  const [sources, setSources] = useState<RawSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<RawSourceContent | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [compiling, setCompiling] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string[] | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const list = await invoke<RawSource[]>("list_raw_sources");
      setSources(list);
    } catch (err) {
      toast({ title: "Failed to load sources", description: String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const filtered = sources.filter((s) => {
    if (typeFilter !== "all" && s.file_type !== typeFilter) return false;
    if (statusFilter === "uncompiled" && (s.compiled || s.file_type === "image")) return false;
    if (statusFilter === "compiled" && !s.compiled) return false;
    return true;
  });

  function toggleSelect(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.path)));
    }
  }

  async function handlePreview(path: string) {
    if (previewPath === path) {
      setPreviewPath(null);
      setPreviewContent(null);
      return;
    }
    setPreviewPath(path);
    setPreviewLoading(true);
    try {
      const content = await invoke<RawSourceContent>("read_raw_source", { path });
      setPreviewContent(content);
    } catch (err) {
      toast({ title: "Preview failed", description: String(err), type: "error" });
      setPreviewPath(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleCompile(paths: string[]) {
    const compilable = paths.filter((p) => {
      const src = sources.find((s) => s.path === p);
      return src && src.file_type !== "image" && !src.compiled;
    });
    if (compilable.length === 0) return;

    setCompiling(new Set(compilable));
    for (const path of compilable) {
      try {
        await invoke("compile_sources", { rawPaths: [path] });
        toast({ title: "Compiled", description: path.split("/").pop(), type: "success" });
      } catch (err) {
        toast({ title: "Compile failed", description: String(err), type: "error" });
      }
    }
    setCompiling(new Set());
    setSelected(new Set());
    await loadSources();
  }

  async function handleDelete(paths: string[]) {
    for (const path of paths) {
      try {
        await invoke("delete_raw_source", { path });
      } catch (err) {
        toast({ title: "Delete failed", description: String(err), type: "error" });
      }
    }
    toast({ title: `Deleted ${paths.length} source${paths.length > 1 ? "s" : ""}`, type: "success" });
    setSelected(new Set());
    setDeleteConfirm(null);
    if (previewPath && paths.includes(previewPath)) {
      setPreviewPath(null);
      setPreviewContent(null);
    }
    await loadSources();
  }

  const selectedCompilable = [...selected].filter((p) => {
    const src = sources.find((s) => s.path === p);
    return src && src.file_type !== "image" && !src.compiled;
  });

  if (!loading && sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={FolderOpen}
          title="No sources yet"
          description="Add articles, papers, or files to get started."
          action={<IngestDialog onIngested={loadSources} triggerVariant="default" />}
        />
      </div>
    );
  }

  const typeFilters: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "article", label: "Articles" },
    { value: "image", label: "Images" },
    { value: "data", label: "Data" },
  ];

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "uncompiled", label: "Uncompiled" },
    { value: "compiled", label: "Compiled" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sources</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {sources.length} file{sources.length !== 1 ? "s" : ""} in your knowledge base
            </p>
          </div>
          <IngestDialog onIngested={loadSources} triggerVariant="default" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-1">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === f.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === f.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex items-center gap-2"
          >
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            {selectedCompilable.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => handleCompile([...selected])}>
                <Play className="h-3 w-3 mr-1" />
                Compile ({selectedCompilable.length})
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm([...selected])}>
              <Trash2 className="h-3 w-3 mr-1" />
              Delete ({selected.size})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 px-4 py-2 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selected.size === filtered.length}
              onChange={toggleSelectAll}
              className="rounded border-input"
            />
            <span className="w-5" />
            <span className="flex-1">Name</span>
            <span className="w-16 text-right">Size</span>
            <span className="w-20 text-right">Modified</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-24 text-center">Actions</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No matching sources</div>
          ) : (
            filtered.map((source) => (
              <div key={source.path}>
                <motion.div
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/30 cursor-pointer transition-colors hover:bg-accent/20 ${
                    previewPath === source.path ? "bg-accent/10" : ""
                  }`}
                  onClick={() => handlePreview(source.path)}
                  whileHover={{ x: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(source.path)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(source.path); }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-input"
                  />
                  <span className="w-5 flex justify-center">{typeIcon(source.file_type)}</span>
                  <span className="flex-1 text-sm truncate" title={source.name}>{source.name}</span>
                  <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">{formatBytes(source.size)}</span>
                  <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">{formatRelativeTime(source.modified)}</span>
                  <span className="w-20 flex justify-center">{statusPill(source)}</span>
                  <span className="w-24 flex justify-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handlePreview(source.path); }}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Preview"
                    >
                      {previewPath === source.path ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {source.file_type !== "image" && !source.compiled && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCompile([source.path]); }}
                        disabled={compiling.has(source.path)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                        title="Compile"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm([source.path]); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </motion.div>

                <AnimatePresence>
                  {previewPath === source.path && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-border/30 bg-muted/30 overflow-hidden"
                    >
                      <div className="px-6 py-4 max-h-64 overflow-auto">
                        {previewLoading ? (
                          <p className="text-sm text-muted-foreground">Loading preview...</p>
                        ) : previewContent?.is_binary ? (
                          <img src={previewContent.content} alt={source.name} className="max-h-48 rounded-md" />
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:text-xs">
                            <ReactMarkdown>{previewContent?.content ?? ""}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-xl shadow-lg p-6 max-w-sm mx-4"
            >
              <h3 className="text-sm font-semibold mb-2">Delete {deleteConfirm.length} source{deleteConfirm.length > 1 ? "s" : ""}?</h3>
              <p className="text-xs text-muted-foreground mb-4">This cannot be undone. The file{deleteConfirm.length > 1 ? "s" : ""} will be permanently removed.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
