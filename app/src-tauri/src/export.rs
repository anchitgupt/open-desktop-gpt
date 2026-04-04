use crate::wiki;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub path: String,
    pub format: String,
}

pub fn export_article(root: &Path, slug: &str, format: &str) -> Result<ExportResult, String> {
    let article = wiki::read_article(root, slug)
        .ok_or_else(|| format!("Article not found: {}", slug))?;

    match format {
        "markdown" => export_markdown(root, &article),
        "marp" => export_marp(root, &article),
        _ => Err(format!("Unknown format: {}", format)),
    }
}

fn export_markdown(root: &Path, article: &wiki::Article) -> Result<ExportResult, String> {
    let dir = root.join("outputs").join("reports");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let now = Utc::now().format("%Y-%m-%d").to_string();
    let content = format!(
        "# {}\n\n> Exported from Open Desktop GPT on {}\n\n---\n\n{}\n\n---\n\n**Categories:** {}\n**Status:** {}\n**Sources:** {}\n",
        article.title,
        now,
        article.body,
        article.categories.join(", "),
        article.status,
        article.sources.join(", "),
    );

    let filename = format!("{}-{}.md", slug_safe(&article.title), now);
    let path = dir.join(&filename);
    fs::write(&path, content).map_err(|e| e.to_string())?;

    let rel = path.strip_prefix(root).unwrap_or(&path).to_string_lossy().to_string();
    Ok(ExportResult { path: rel, format: "markdown".to_string() })
}

fn export_marp(root: &Path, article: &wiki::Article) -> Result<ExportResult, String> {
    let dir = root.join("outputs").join("slides");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    // Split article body into slides at ## headings
    let mut slides = Vec::new();

    // Title slide
    slides.push(format!(
        "---\nmarp: true\ntheme: default\npaginate: true\n---\n\n# {}\n\n{}\n",
        article.title,
        article.categories.join(" · ")
    ));

    // Content slides — split on ## headings
    let mut current_slide = String::new();
    for line in article.body.lines() {
        if line.starts_with("## ") {
            if !current_slide.trim().is_empty() {
                slides.push(format!("---\n\n{}", current_slide.trim()));
            }
            current_slide = format!("{}\n\n", line);
        } else {
            current_slide.push_str(line);
            current_slide.push('\n');
        }
    }
    if !current_slide.trim().is_empty() {
        slides.push(format!("---\n\n{}", current_slide.trim()));
    }

    let content = slides.join("\n\n");
    let now = Utc::now().format("%Y-%m-%d").to_string();
    let filename = format!("{}-{}.md", slug_safe(&article.title), now);
    let path = dir.join(&filename);
    fs::write(&path, content).map_err(|e| e.to_string())?;

    let rel = path.strip_prefix(root).unwrap_or(&path).to_string_lossy().to_string();
    Ok(ExportResult { path: rel, format: "marp".to_string() })
}

fn slug_safe(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-')
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .take(50)
        .collect()
}
