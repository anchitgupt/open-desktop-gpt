mod compile;
mod config;
mod ingest;
mod llm;
mod wiki;

use std::path::PathBuf;
use tauri::ipc::Channel;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
enum StreamEvent {
    #[serde(rename_all = "camelCase")]
    Token { text: String },
    #[serde(rename_all = "camelCase")]
    Done { full_text: String },
    #[serde(rename_all = "camelCase")]
    Error { message: String },
}

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

#[tauri::command]
async fn compile_sources(raw_paths: Vec<String>) -> Result<compile::CompileResult, String> {
    compile::compile(&project_root(), raw_paths).await
}

#[tauri::command]
async fn ingest_url(url: String) -> Result<ingest::IngestResult, String> {
    ingest::ingest_url(&project_root(), &url).await
}

#[tauri::command]
fn ingest_file(path: String) -> Result<ingest::IngestResult, String> {
    ingest::ingest_file(&project_root(), &path)
}

#[tauri::command]
fn get_config() -> config::AppConfig {
    config::load_config(&project_root())
}

#[tauri::command]
fn set_config(config: config::AppConfig) -> Result<(), String> {
    config::save_config(&project_root(), &config)
}

#[tauri::command]
async fn ask(question: String, on_event: Channel<StreamEvent>) -> Result<(), String> {
    let root = project_root();
    let cfg = config::load_config(&root);
    let provider = llm::create_provider(&cfg.llm);

    let index = wiki::get_index_file(&root, "_index.md").unwrap_or_default();
    let articles = wiki::list_articles(&root);

    let q_lower = question.to_lowercase();
    let mut relevant_content = String::new();
    let mut count = 0;
    for article in &articles {
        if count >= 5 { break; }
        let title_lower = article.title.to_lowercase();
        let cats_lower: Vec<String> = article.categories.iter().map(|c| c.to_lowercase()).collect();
        let q_words: Vec<&str> = q_lower.split_whitespace().collect();

        let is_relevant = q_words.iter().any(|w| title_lower.contains(w))
            || cats_lower.iter().any(|c| q_words.iter().any(|w| c.contains(w)));

        if is_relevant {
            if let Some(a) = wiki::read_article(&root, &article.slug) {
                relevant_content.push_str(&format!("\n\n## {}\n{}", a.title, a.body));
                count += 1;
            }
        }
    }

    let system = format!(
        "You are a knowledge assistant. Answer questions based on the wiki content below. \
        Cite articles using [[article-slug]] wiki-link syntax. If the wiki doesn't have enough \
        information, say so.\n\nWiki Index:\n{}\n\nRelevant Articles:\n{}",
        index, relevant_content
    );

    let on_event_clone = on_event.clone();
    let result = provider
        .stream_complete(
            &system,
            vec![llm::Message { role: "user".to_string(), content: question }],
            Box::new(move |token| {
                let _ = on_event_clone.send(StreamEvent::Token { text: token });
            }),
        )
        .await;

    match result {
        Ok(full_text) => {
            let _ = on_event.send(StreamEvent::Done { full_text });
            Ok(())
        }
        Err(e) => {
            let _ = on_event.send(StreamEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}

#[tauri::command]
fn file_answer(question: String, answer: String) -> Result<String, String> {
    let root = project_root();
    let slug = question
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-')
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .take(60)
        .collect::<String>();

    let now = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let content = format!(
        "---\ntitle: \"{}\"\ncategories: [\"Q&A\"]\nsources: []\ncreated: {}\nupdated: {}\nstatus: draft\n---\n\n# {}\n\n> {}\n\n{}\n",
        question.replace('"', "\\\""), now, now, question, question, answer
    );

    let dest = root.join("wiki").join(format!("{}.md", slug));
    std::fs::write(&dest, content).map_err(|e| format!("Write failed: {}", e))?;

    Ok(slug)
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
            compile_sources,
            ingest_url,
            ingest_file,
            get_config,
            set_config,
            ask,
            file_answer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
