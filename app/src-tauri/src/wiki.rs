use gray_matter::Matter;
use gray_matter::engine::YAML;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArticleMeta {
    pub slug: String,
    pub title: String,
    pub categories: Vec<String>,
    pub status: String,
    pub word_count: usize,
    pub updated: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Article {
    pub slug: String,
    pub title: String,
    pub categories: Vec<String>,
    pub status: String,
    pub updated: String,
    pub sources: Vec<String>,
    pub body: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WikiStats {
    pub article_count: usize,
    pub total_words: usize,
    pub categories: Vec<CategoryCount>,
    pub orphans: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryCount {
    pub name: String,
    pub count: usize,
}

fn wiki_dir(root: &Path) -> PathBuf {
    root.join("wiki")
}

fn raw_dir(root: &Path) -> PathBuf {
    root.join("raw")
}

pub fn list_articles(root: &Path) -> Vec<ArticleMeta> {
    let wiki = wiki_dir(root);
    let mut articles = Vec::new();
    let matter = Matter::<YAML>::new();

    for entry in WalkDir::new(&wiki).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") {
            continue;
        }
        let filename = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        if filename.starts_with('_') {
            continue;
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let parsed = matter.parse(&content);
        let frontmatter = parsed.data.as_ref()
            .and_then(|d| d.as_hashmap().ok())
            .unwrap_or_default();

        let title = frontmatter.get("title")
            .and_then(|v| v.as_string().ok())
            .unwrap_or_else(|| filename.clone());

        let categories: Vec<String> = frontmatter.get("categories")
            .and_then(|v| v.as_vec().ok())
            .map(|v| v.iter().filter_map(|i| i.as_string().ok()).collect())
            .unwrap_or_default();

        let status = frontmatter.get("status")
            .and_then(|v| v.as_string().ok())
            .unwrap_or_else(|| "draft".to_string());

        let updated = frontmatter.get("updated")
            .and_then(|v| v.as_string().ok())
            .unwrap_or_default();

        let word_count = parsed.content.split_whitespace().count();

        articles.push(ArticleMeta {
            slug: filename,
            title,
            categories,
            status,
            word_count,
            updated,
        });
    }

    articles.sort_by(|a, b| b.updated.cmp(&a.updated));
    articles
}

pub fn read_article(root: &Path, slug: &str) -> Option<Article> {
    let path = wiki_dir(root).join(format!("{}.md", slug));
    let content = fs::read_to_string(&path).ok()?;
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);

    let frontmatter = parsed.data.as_ref()
        .and_then(|d| d.as_hashmap().ok())
        .unwrap_or_default();

    let title = frontmatter.get("title")
        .and_then(|v| v.as_string().ok())
        .unwrap_or_else(|| slug.to_string());

    let categories: Vec<String> = frontmatter.get("categories")
        .and_then(|v| v.as_vec().ok())
        .map(|v| v.iter().filter_map(|i| i.as_string().ok()).collect())
        .unwrap_or_default();

    let status = frontmatter.get("status")
        .and_then(|v| v.as_string().ok())
        .unwrap_or_else(|| "draft".to_string());

    let updated = frontmatter.get("updated")
        .and_then(|v| v.as_string().ok())
        .unwrap_or_default();

    let sources: Vec<String> = frontmatter.get("sources")
        .and_then(|v| v.as_vec().ok())
        .map(|v| v.iter().filter_map(|i| i.as_string().ok()).collect())
        .unwrap_or_default();

    Some(Article {
        slug: slug.to_string(),
        title,
        categories,
        status,
        updated,
        sources,
        body: parsed.content,
    })
}

pub fn get_stats(root: &Path) -> WikiStats {
    let articles = list_articles(root);
    let total_words: usize = articles.iter().map(|a| a.word_count).sum();

    let mut cat_map = std::collections::HashMap::new();
    for article in &articles {
        for cat in &article.categories {
            *cat_map.entry(cat.clone()).or_insert(0usize) += 1;
        }
    }
    let mut categories: Vec<CategoryCount> = cat_map
        .into_iter()
        .map(|(name, count)| CategoryCount { name, count })
        .collect();
    categories.sort_by(|a, b| b.count.cmp(&a.count));

    let wiki = wiki_dir(root);
    let all_content: String = articles.iter().filter_map(|a| {
        fs::read_to_string(wiki.join(format!("{}.md", a.slug))).ok()
    }).collect::<Vec<_>>().join("\n");

    let orphans: Vec<String> = articles.iter()
        .filter(|a| !all_content.contains(&format!("[[{}]]", a.slug)))
        .map(|a| a.slug.clone())
        .collect();

    WikiStats {
        article_count: articles.len(),
        total_words,
        categories,
        orphans,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphNode {
    pub slug: String,
    pub title: String,
    pub category: String,
    pub word_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

pub fn get_graph_data(root: &Path) -> GraphData {
    let articles = list_articles(root);
    let wiki = wiki_dir(root);

    let nodes: Vec<GraphNode> = articles.iter().map(|a| GraphNode {
        slug: a.slug.clone(),
        title: a.title.clone(),
        category: a.categories.first().cloned().unwrap_or_else(|| "Uncategorized".to_string()),
        word_count: a.word_count,
    }).collect();

    let slug_set: std::collections::HashSet<&str> = articles.iter().map(|a| a.slug.as_str()).collect();
    let mut edges = Vec::new();
    let link_re = regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap();

    for article in &articles {
        if let Ok(content) = fs::read_to_string(wiki.join(format!("{}.md", article.slug))) {
            for cap in link_re.captures_iter(&content) {
                let target = cap[1].split('|').next().unwrap_or("").trim().to_lowercase().replace(' ', "-");
                if slug_set.contains(target.as_str()) && target != article.slug {
                    edges.push(GraphEdge {
                        source: article.slug.clone(),
                        target,
                    });
                }
            }
        }
    }

    GraphData { nodes, edges }
}

pub fn get_index_file(root: &Path, name: &str) -> Option<String> {
    let path = wiki_dir(root).join(name);
    fs::read_to_string(path).ok()
}

pub fn get_backlinks(root: &Path, slug: &str) -> Vec<String> {
    let wiki = wiki_dir(root);
    let target = format!("[[{}]]", slug);
    let mut backlinks = Vec::new();

    for entry in WalkDir::new(&wiki).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") {
            continue;
        }
        let filename = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        if filename.starts_with('_') || filename == slug {
            continue;
        }
        if let Ok(content) = fs::read_to_string(path) {
            if content.contains(&target) {
                backlinks.push(filename);
            }
        }
    }
    backlinks
}

pub fn get_recent_compilations(root: &Path, limit: usize) -> Vec<serde_json::Value> {
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");
    let content = fs::read_to_string(&log_path).unwrap_or_default();
    let mut entries: Vec<serde_json::Value> = content
        .lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();
    entries.reverse();
    entries.truncate(limit);
    entries
}

pub fn list_uncompiled(root: &Path) -> Vec<String> {
    let raw = raw_dir(root);
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");

    let compiled_files: std::collections::HashSet<String> = fs::read_to_string(&log_path)
        .unwrap_or_default()
        .lines()
        .filter_map(|line| {
            serde_json::from_str::<serde_json::Value>(line).ok()
        })
        .filter(|v| v.get("action").and_then(|a| a.as_str()) == Some("compile"))
        .filter_map(|v| v.get("dest").and_then(|d| d.as_str().map(|s| s.to_string())))
        .collect();

    let mut uncompiled = Vec::new();
    for entry in WalkDir::new(&raw).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.file_name().map_or(false, |n| n == ".gitkeep") {
            continue;
        }
        let rel = path.strip_prefix(root).unwrap_or(path);
        let rel_str = rel.to_string_lossy().to_string();
        if !compiled_files.contains(&rel_str) {
            uncompiled.push(rel_str);
        }
    }

    uncompiled
}
