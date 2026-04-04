import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

interface UncompiledListProps {
  paths: string[];
  onCompiled: () => void;
}

export function UncompiledList({ paths, onCompiled }: UncompiledListProps) {
  const [compiling, setCompiling] = useState<string | null>(null);

  async function handleCompile(path: string) {
    setCompiling(path);
    try {
      await invoke("compile_sources", { rawPaths: [path] });
      onCompiled();
    } catch (err) {
      console.error("Compile failed:", err);
      alert(`Compile failed: ${err}`);
    } finally {
      setCompiling(null);
    }
  }

  async function handleCompileAll() {
    setCompiling("all");
    try {
      await invoke("compile_sources", { rawPaths: paths });
      onCompiled();
    } catch (err) {
      console.error("Compile all failed:", err);
      alert(`Compile failed: ${err}`);
    } finally {
      setCompiling(null);
    }
  }

  if (paths.length === 0) return null;

  return (
    <div className="space-y-1">
      {paths.length > 1 && (
        <Button variant="outline" size="sm" className="w-full mb-1"
          onClick={handleCompileAll} disabled={compiling !== null}>
          {compiling === "all" ? "Compiling..." : `Compile All (${paths.length})`}
        </Button>
      )}
      {paths.map((path) => {
        const filename = path.split("/").pop() ?? path;
        return (
          <div key={path} className="flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-accent">
            <span className="truncate flex-1 text-muted-foreground" title={path}>{filename}</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
              onClick={() => handleCompile(path)} disabled={compiling !== null}>
              {compiling === path ? "..." : "Compile"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
