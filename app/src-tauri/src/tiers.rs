use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::{Utc, NaiveDate};
use gray_matter::Matter;
use gray_matter::engine::YAML;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct ArticleHealth {
    pub slug: String,
    pub title: String,
    pub status: String,
    pub days_since_update: i64,
    pub is_stale: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TierSummary {
    pub draft: usize,
    pub review: usize,
    pub published: usize,
    pub stale: usize,
}

pub fn get_tier_summary(root: &Path) -> TierSummary {
    let wiki = root.join("wiki");
    let matter = Matter::<YAML>::new();
    let mut summary = TierSummary { draft: 0, review: 0, published: 0, stale: 0 };
    let today = Utc::now().date_naive();

    for entry in WalkDir::new(&wiki).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") { continue; }
        let filename = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        if filename.starts_with('_') { continue; }

        let content = match fs::read_to_string(path) { Ok(c) => c, Err(_) => continue };
        let parsed = matter.parse(&content);
        let fm = parsed.data.as_ref().and_then(|d| d.as_hashmap().ok()).unwrap_or_default();

        let status = fm.get("status").and_then(|v| v.as_string().ok()).unwrap_or_else(|| "draft".to_string());
        match status.as_str() {
            "published" => summary.published += 1,
            "review" => summary.review += 1,
            _ => summary.draft += 1,
        }

        // Check staleness (>30 days since update)
        if let Some(updated) = fm.get("updated").and_then(|v| v.as_string().ok()) {
            if let Ok(date) = NaiveDate::parse_from_str(&updated, "%Y-%m-%d") {
                if (today - date).num_days() > 30 {
                    summary.stale += 1;
                }
            }
        }
    }

    summary
}

pub fn promote_article(root: &Path, slug: &str) -> Result<String, String> {
    let path = root.join("wiki").join(format!("{}.md", slug));
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    let new_status = if content.contains("status: draft") {
        "review"
    } else if content.contains("status: review") {
        "published"
    } else {
        return Ok("already published".to_string());
    };

    let today = Utc::now().format("%Y-%m-%d").to_string();
    let updated = content
        .replace("status: draft", &format!("status: {}", new_status))
        .replace("status: review", &format!("status: {}", new_status));

    // Also update the 'updated' date
    let re = regex::Regex::new(r"updated: \d{4}-\d{2}-\d{2}").unwrap();
    let updated = re.replace(&updated, &format!("updated: {}", today)).to_string();

    fs::write(&path, updated).map_err(|e| e.to_string())?;
    Ok(new_status.to_string())
}

pub fn decay_stale_articles(root: &Path, days_threshold: i64) -> Vec<String> {
    let wiki = root.join("wiki");
    let matter = Matter::<YAML>::new();
    let today = Utc::now().date_naive();
    let mut decayed = Vec::new();

    for entry in WalkDir::new(&wiki).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") { continue; }
        let filename = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        if filename.starts_with('_') { continue; }

        let content = match fs::read_to_string(path) { Ok(c) => c, Err(_) => continue };
        let parsed = matter.parse(&content);
        let fm = parsed.data.as_ref().and_then(|d| d.as_hashmap().ok()).unwrap_or_default();

        let status = fm.get("status").and_then(|v| v.as_string().ok()).unwrap_or_default();
        if status == "draft" { continue; } // Don't decay drafts further

        if let Some(updated) = fm.get("updated").and_then(|v| v.as_string().ok()) {
            if let Ok(date) = NaiveDate::parse_from_str(&updated, "%Y-%m-%d") {
                if (today - date).num_days() > days_threshold {
                    // Demote: published → review, review → draft
                    let new_status = if status == "published" { "review" } else { "draft" };
                    let new_content = content.replace(
                        &format!("status: {}", status),
                        &format!("status: {}", new_status),
                    );
                    if fs::write(path, new_content).is_ok() {
                        decayed.push(filename);
                    }
                }
            }
        }
    }

    decayed
}
