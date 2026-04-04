use notify::{EventKind, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct FileChangePayload {
    pub path: String,
    pub kind: String,
}

pub fn start_watcher(app_handle: tauri::AppHandle, root_path: String) {
    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = notify::recommended_watcher(tx).expect("Failed to create watcher");

        let wiki_path = Path::new(&root_path).join("wiki");
        let raw_path = Path::new(&root_path).join("raw");

        if wiki_path.exists() {
            watcher
                .watch(&wiki_path, RecursiveMode::Recursive)
                .expect("Failed to watch wiki/");
        }
        if raw_path.exists() {
            watcher
                .watch(&raw_path, RecursiveMode::Recursive)
                .expect("Failed to watch raw/");
        }

        for res in rx {
            if let Ok(event) = res {
                let kind = match event.kind {
                    EventKind::Create(_) => "create",
                    EventKind::Modify(_) => "modify",
                    EventKind::Remove(_) => "remove",
                    _ => continue,
                };

                for path in &event.paths {
                    let _ = app_handle.emit(
                        "file-changed",
                        FileChangePayload {
                            path: path.to_string_lossy().to_string(),
                            kind: kind.to_string(),
                        },
                    );
                }
            }
        }
    });
}
