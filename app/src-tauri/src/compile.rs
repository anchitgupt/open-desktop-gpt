use crate::config;
use crate::llm::{self, Message};
use crate::wiki;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileResult {
    pub articles_created: Vec<String>,
    pub articles_updated: Vec<String>,
}

pub async fn compile(root: &Path, raw_paths: Vec<String>) -> Result<CompileResult, String> {
    let cfg = config::load_config(root);
    let provider = llm::create_provider(&cfg.llm);

    let claude_md = fs::read_to_string(root.join("CLAUDE.md")).unwrap_or_default();
    let index = wiki::get_index_file(root, "_index.md").unwrap_or_default();
    let concepts = wiki::get_index_file(root, "_concepts.md").unwrap_or_default();

    let mut raw_contents = Vec::new();
    for path in &raw_paths {
        let full_path = root.join(path);
        match fs::read_to_string(&full_path) {
            Ok(content) => raw_contents.push(format!("## Source: {}\n\n{}", path, content)),
            Err(e) => return Err(format!("Failed to read {}: {}", path, e)),
        }
    }

    let system_prompt = format!(
        "You are a knowledge base compiler. Follow these instructions exactly:\n\n{}\n\n\
        Current wiki index:\n{}\n\nCurrent concepts:\n{}\n\n\
        IMPORTANT: Return your response as one or more wiki articles in this exact format:\n\
        For each article, output:\n\
        ===FILE: <filename>.md===\n\
        <full article content with frontmatter>\n\
        ===END FILE===\n\n\
        Also output index updates in the same format for _index.md, _concepts.md, _categories.md, and _recent.md.\n\
        Use today's date: {}",
        claude_md, index, concepts, Utc::now().format("%Y-%m-%d")
    );

    let user_msg = format!(
        "Compile the following raw source(s) into wiki articles:\n\n{}",
        raw_contents.join("\n\n---\n\n")
    );

    let response = provider
        .complete(&system_prompt, vec![Message { role: "user".to_string(), content: user_msg }])
        .await?;

    let mut result = CompileResult {
        articles_created: Vec::new(),
        articles_updated: Vec::new(),
    };

    let wiki_dir = root.join("wiki");
    let file_re = regex::Regex::new(r"===FILE: (.+?)===\n([\s\S]*?)===END FILE===").unwrap();

    for cap in file_re.captures_iter(&response) {
        let filename = cap[1].trim();
        let content = cap[2].trim();

        let dest = wiki_dir.join(filename);
        let existed = dest.exists();

        fs::write(&dest, content).map_err(|e| format!("Write failed: {}", e))?;

        if existed {
            result.articles_updated.push(filename.to_string());
        } else {
            result.articles_created.push(filename.to_string());
        }
    }

    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        use std::io::Write;
        for raw_path in &raw_paths {
            let entry = serde_json::json!({
                "timestamp": Utc::now().to_rfc3339(),
                "action": "compile",
                "dest": raw_path,
                "articles_created": result.articles_created,
                "articles_updated": result.articles_updated,
            });
            let _ = writeln!(file, "{}", serde_json::to_string(&entry).unwrap_or_default());
        }
    }

    Ok(result)
}
