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
		}).catch((err) => {
			console.error("Failed to set up file watcher:", err);
		});

		return () => {
			unlisten?.();
		};
	}, [onChange]);
}
