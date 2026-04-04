use gray_matter::Matter;
use gray_matter::engine::YAML;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{doc, Index, ReloadPolicy, TantivyDocument};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub slug: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}

fn owned_value_as_str(val: &OwnedValue) -> Option<&str> {
    if let OwnedValue::Str(s) = val {
        Some(s.as_str())
    } else {
        None
    }
}

pub fn search_articles(root: &Path, query: &str, limit: usize) -> Vec<SearchResult> {
    let wiki_dir = root.join("wiki");

    // Build schema
    let mut schema_builder = Schema::builder();
    let slug_field = schema_builder.add_text_field("slug", STRING | STORED);
    let title_field = schema_builder.add_text_field("title", TEXT | STORED);
    let body_field = schema_builder.add_text_field("body", TEXT | STORED);
    let schema = schema_builder.build();

    // Create RAM index — returns Index directly in tantivy 0.22
    let index = Index::create_in_ram(schema.clone());

    // Index all wiki articles
    let mut writer = match index.writer::<TantivyDocument>(50_000_000) {
        Ok(w) => w,
        Err(_) => return Vec::new(),
    };

    let matter = Matter::<YAML>::new();

    for entry in WalkDir::new(&wiki_dir)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") {
            continue;
        }
        let filename = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        if filename.starts_with('_') {
            continue;
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let parsed = matter.parse(&content);
        let frontmatter = parsed
            .data
            .as_ref()
            .and_then(|d| d.as_hashmap().ok())
            .unwrap_or_default();

        let title = frontmatter
            .get("title")
            .and_then(|v| v.as_string().ok())
            .unwrap_or_else(|| filename.clone());

        let _ = writer.add_document(doc!(
            slug_field => filename,
            title_field => title,
            body_field => parsed.content,
        ));
    }

    if writer.commit().is_err() {
        return Vec::new();
    }

    // Build reader
    let reader = match index
        .reader_builder()
        .reload_policy(ReloadPolicy::Manual)
        .try_into()
    {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    let searcher = reader.searcher();
    let query_parser = QueryParser::for_index(&index, vec![title_field, body_field]);

    let parsed_query = match query_parser.parse_query(query) {
        Ok(q) => q,
        Err(_) => return Vec::new(),
    };

    let top_docs = match searcher.search(&parsed_query, &TopDocs::with_limit(limit)) {
        Ok(docs) => docs,
        Err(_) => return Vec::new(),
    };

    let mut results = Vec::new();
    for (score, doc_address) in top_docs {
        if let Ok(retrieved) = searcher.doc::<TantivyDocument>(doc_address) {
            let slug = retrieved
                .get_first(slug_field)
                .and_then(owned_value_as_str)
                .unwrap_or("")
                .to_string();
            let title = retrieved
                .get_first(title_field)
                .and_then(owned_value_as_str)
                .unwrap_or("")
                .to_string();
            let body = retrieved
                .get_first(body_field)
                .and_then(owned_value_as_str)
                .unwrap_or("")
                .to_string();

            // Create a snippet: first 150 chars of body
            let snippet = body.chars().take(150).collect::<String>();

            results.push(SearchResult {
                slug,
                title,
                snippet,
                score,
            });
        }
    }

    results
}
