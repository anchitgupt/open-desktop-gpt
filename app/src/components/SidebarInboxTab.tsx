import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UncompiledList } from "./UncompiledList";

interface SidebarInboxTabProps {
  uncompiled: string[];
  onRefresh: () => void;
}

export function SidebarInboxTab({ uncompiled, onRefresh }: SidebarInboxTabProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        try {
          await invoke("ingest_file", { path: (file as any).path });
        } catch (err) {
          console.error("Ingest failed:", err);
        }
      }
      onRefresh();
    },
    [onRefresh]
  );

  const isEmpty = uncompiled.length === 0;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/50"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-xs text-muted-foreground">All sources compiled</p>
            </div>
          ) : (
            <UncompiledList paths={uncompiled} onCompiled={onRefresh} />
          )}
        </div>
      </ScrollArea>

      {/* Drag-and-drop zone */}
      <div
        className={`mx-2 mb-2 mt-1 border-2 border-dashed rounded-md p-3 text-center text-xs text-muted-foreground transition-colors ${
          dragOver ? "border-primary bg-primary/5 text-foreground" : "border-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver ? "Drop to ingest" : "Drop files here"}
      </div>
    </div>
  );
}
