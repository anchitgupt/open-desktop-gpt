use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct IngestResult {
    pub dest: String,
    pub title: String,
}

fn slugify(text: &str) -> String {
    let re = Regex::new(r"[^\w\s-]").unwrap();
    let text = text.to_lowercase().trim().to_string();
    let text = re.replace_all(&text, "").to_string();
    let re2 = Regex::new(r"[\s_]+").unwrap();
    let text = re2.replace_all(&text, "-").to_string();
    text.chars().take(80).collect::<String>().trim_matches('-').to_string()
}

fn log_action(root: &Path, action: &str, details: serde_json::Value) {
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        let mut entry = details;
        entry["timestamp"] = serde_json::Value::String(Utc::now().to_rfc3339());
        entry["action"] = serde_json::Value::String(action.to_string());
        if let Ok(json) = serde_json::to_string(&entry) {
            use std::io::Write;
            let _ = writeln!(file, "{}", json);
        }
    }
}

pub async fn ingest_url(root: &Path, url: &str) -> Result<IngestResult, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (KnowledgeGPT/1.0)")
        .send()
        .await
        .map_err(|e| format!("Fetch failed: {}", e))?;

    let html = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

    let title = extract_title(&html, url);
    let slug = slugify(&title);
    let now = Utc::now().format("%Y-%m-%d").to_string();

    let content = strip_html_tags(&html);

    let domain = url::Url::parse(url)
        .map(|u| u.host_str().unwrap_or("unknown").to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let frontmatter = format!(
        "---\ntitle: \"{}\"\nsource_url: \"{}\"\nsource_domain: \"{}\"\ningested: {}\ntype: article\n---\n\n",
        title.replace('"', "\\\""), url, domain, now
    );

    let raw_dir = root.join("raw").join("articles");
    fs::create_dir_all(&raw_dir).map_err(|e| format!("mkdir failed: {}", e))?;

    let mut dest = raw_dir.join(format!("{}.md", slug));
    let mut counter = 1;
    while dest.exists() {
        dest = raw_dir.join(format!("{}-{}.md", slug, counter));
        counter += 1;
    }

    fs::write(&dest, format!("{}{}", frontmatter, content))
        .map_err(|e| format!("Write failed: {}", e))?;

    let rel = dest.strip_prefix(root).unwrap_or(&dest).to_string_lossy().to_string();
    log_action(root, "ingest_url", serde_json::json!({
        "url": url,
        "dest": &rel,
        "title": &title,
    }));

    Ok(IngestResult { dest: rel, title })
}

pub fn ingest_file(root: &Path, source_path: &str) -> Result<IngestResult, String> {
    let src = PathBuf::from(source_path);
    if !src.exists() {
        return Err(format!("File not found: {}", source_path));
    }

    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let category = match ext.as_str() {
        "pdf" => "papers",
        "md" | "markdown" | "txt" => "articles",
        "csv" | "json" | "jsonl" => "datasets",
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" => "images",
        _ => "articles",
    };

    let raw_dir = root.join("raw").join(category);
    fs::create_dir_all(&raw_dir).map_err(|e| format!("mkdir failed: {}", e))?;

    let filename = src.file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut dest = raw_dir.join(&filename);
    let mut counter = 1;
    while dest.exists() {
        let stem = src.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let ext_str = src.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        dest = raw_dir.join(format!("{}-{}{}", stem, counter, ext_str));
        counter += 1;
    }

    fs::copy(&src, &dest).map_err(|e| format!("Copy failed: {}", e))?;

    let rel = dest.strip_prefix(root).unwrap_or(&dest).to_string_lossy().to_string();
    log_action(root, "ingest_file", serde_json::json!({
        "source": source_path,
        "dest": &rel,
    }));

    Ok(IngestResult { dest: rel, title: filename })
}

fn extract_title(html: &str, fallback_url: &str) -> String {
    if let Some(start) = html.find("<title") {
        if let Some(tag_end) = html[start..].find('>') {
            let after_tag = start + tag_end + 1;
            if let Some(end) = html[after_tag..].find("</title>") {
                let title = html[after_tag..after_tag + end].trim().to_string();
                if !title.is_empty() {
                    return title;
                }
            }
        }
    }
    fallback_url.to_string()
}

fn strip_html_tags(html: &str) -> String {
    let re = Regex::new(r"<[^>]+>").unwrap();
    let text = re.replace_all(html, "").to_string();
    let re2 = Regex::new(r"\n{3,}").unwrap();
    re2.replace_all(&text, "\n\n").trim().to_string()
}
