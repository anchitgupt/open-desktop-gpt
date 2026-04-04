import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

interface FileChangePayload {
  path: string;
  kind: string;
}

export function useFileWatcher(onChange: (payload: FileChangePayload) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<FileChangePayload>("file-changed", (event) => {
      onChange(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [onChange]);
}
