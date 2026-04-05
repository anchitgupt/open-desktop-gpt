use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RawSource {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub modified: String,
    pub file_type: String,
    pub compiled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RawSourceContent {
    pub content: String,
    pub is_binary: bool,
}

fn detect_file_type(ext: &str) -> &'static str {
    match ext {
        "md" | "txt" | "markdown" => "article",
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" => "image",
        "csv" | "json" | "jsonl" => "data",
        "pdf" => "article",
        _ => "other",
    }
}

fn is_binary_type(file_type: &str) -> bool {
    file_type == "image"
}

fn get_compiled_set(root: &Path) -> std::collections::HashSet<String> {
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");
    fs::read_to_string(&log_path)
        .unwrap_or_default()
        .lines()
        .filter_map(|line| serde_json::from_str::<serde_json::Value>(line).ok())
        .filter(|v| v.get("action").and_then(|a| a.as_str()) == Some("compile"))
        .filter_map(|v| v.get("dest").and_then(|d| d.as_str().map(|s| s.to_string())))
        .collect()
}

pub fn list_raw_sources(root: &Path) -> Vec<RawSource> {
    let raw = root.join("raw");
    let compiled_set = get_compiled_set(root);
    let mut sources = Vec::new();

    for entry in WalkDir::new(&raw).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.file_name().map_or(false, |n| n == ".gitkeep") {
            continue;
        }

        let rel = path.strip_prefix(root).unwrap_or(path).to_string_lossy().to_string();
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        let file_type = detect_file_type(&ext).to_string();

        let meta = fs::metadata(path).ok();
        let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = meta
            .and_then(|m| m.modified().ok())
            .map(|t| {
                let dt: DateTime<Utc> = t.into();
                dt.to_rfc3339()
            })
            .unwrap_or_default();

        let compiled = compiled_set.contains(&rel);

        sources.push(RawSource {
            path: rel,
            name,
            size,
            modified,
            file_type,
            compiled,
        });
    }

    sources.sort_by(|a, b| b.modified.cmp(&a.modified));
    sources
}

pub fn delete_raw_source(root: &Path, path: &str) -> Result<(), String> {
    let full = root.join(path);
    if !full.starts_with(root.join("raw")) {
        return Err("Path must be inside raw/".to_string());
    }
    if !full.exists() {
        return Err(format!("File not found: {}", path));
    }
    fs::remove_file(&full).map_err(|e| format!("Delete failed: {}", e))
}

pub fn read_raw_source(root: &Path, path: &str) -> Result<RawSourceContent, String> {
    let full = root.join(path);
    if !full.starts_with(root.join("raw")) {
        return Err("Path must be inside raw/".to_string());
    }
    if !full.exists() {
        return Err(format!("File not found: {}", path));
    }

    let ext = full.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let file_type = detect_file_type(&ext);

    if is_binary_type(file_type) {
        let bytes = fs::read(&full).map_err(|e| format!("Read failed: {}", e))?;
        let mime = match ext.as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "svg" => "image/svg+xml",
            "webp" => "image/webp",
            _ => "application/octet-stream",
        };
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Ok(RawSourceContent {
            content: format!("data:{};base64,{}", mime, b64),
            is_binary: true,
        })
    } else {
        let text = fs::read_to_string(&full).map_err(|e| format!("Read failed: {}", e))?;
        let preview = if text.len() > 2000 {
            format!("{}...", &text[..2000])
        } else {
            text
        };
        Ok(RawSourceContent {
            content: preview,
            is_binary: false,
        })
    }
}
