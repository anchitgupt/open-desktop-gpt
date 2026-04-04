mod wiki;

use std::path::PathBuf;

fn project_root() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .expect("failed to get exe path")
        .parent()
        .expect("failed to get exe parent")
        .to_path_buf();

    if cfg!(debug_assertions) {
        let mut dir = exe_dir.clone();
        loop {
            if dir.join("wiki").exists() && dir.join("raw").exists() {
                return dir;
            }
            if !dir.pop() {
                break;
            }
        }
    }
    std::env::current_dir().expect("failed to get cwd")
}

#[tauri::command]
fn list_articles() -> Vec<wiki::ArticleMeta> {
    wiki::list_articles(&project_root())
}

#[tauri::command]
fn read_article(slug: String) -> Option<wiki::Article> {
    wiki::read_article(&project_root(), &slug)
}

#[tauri::command]
fn get_stats() -> wiki::WikiStats {
    wiki::get_stats(&project_root())
}

#[tauri::command]
fn get_index_file(name: String) -> Option<String> {
    wiki::get_index_file(&project_root(), &name)
}

#[tauri::command]
fn list_uncompiled() -> Vec<String> {
    wiki::list_uncompiled(&project_root())
}

#[tauri::command]
fn get_backlinks(slug: String) -> Vec<String> {
    wiki::get_backlinks(&project_root(), &slug)
}

#[tauri::command]
fn get_recent_compilations(limit: usize) -> Vec<serde_json::Value> {
    wiki::get_recent_compilations(&project_root(), limit)
}

#[tauri::command]
fn open_in_editor(slug: String) -> Result<(), String> {
    let path = project_root().join("wiki").join(format!("{}.md", slug));
    open::that(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_articles,
            read_article,
            get_stats,
            get_index_file,
            list_uncompiled,
            get_backlinks,
            get_recent_compilations,
            open_in_editor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
