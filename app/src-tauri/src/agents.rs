use crate::config;
use crate::llm::{self, Message};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentStep {
    pub name: String,
    pub status: String, // "pending" | "running" | "done" | "error"
    pub output: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentPipeline {
    pub steps: Vec<AgentStep>,
}

pub async fn run_agent_pipeline(
    root: &Path,
    raw_content: &str,
    wiki_context: &str,
    on_step: impl Fn(AgentStep),
) -> Result<String, String> {
    let cfg = config::load_config(root);
    let provider = llm::create_provider(&cfg.llm);

    // Step 1: Summarizer
    on_step(AgentStep {
        name: "Summarizer".to_string(),
        status: "running".to_string(),
        output: String::new(),
    });

    let summary = provider
        .complete(
            "You are a research summarizer. Read the source document and produce a structured summary with:\n\
            1. Title\n\
            2. Key points (bullet list)\n\
            3. Main concepts introduced\n\
            4. Notable claims or findings\n\
            5. Potential connections to other topics\n\n\
            Be thorough but concise.",
            vec![Message {
                role: "user".to_string(),
                content: format!("Summarize this source:\n\n{}", raw_content),
            }],
        )
        .await?;

    on_step(AgentStep {
        name: "Summarizer".to_string(),
        status: "done".to_string(),
        output: summary.chars().take(200).collect(),
    });

    // Step 2: Cross-Referencer
    on_step(AgentStep {
        name: "Cross-Referencer".to_string(),
        status: "running".to_string(),
        output: String::new(),
    });

    let cross_refs = provider
        .complete(
            "You are a knowledge base cross-referencer. Given a summary of a new source and the existing wiki context, identify:\n\
            1. Which existing articles should be updated with new information\n\
            2. Which existing articles should be linked from the new article\n\
            3. Any contradictions between the new source and existing articles\n\
            4. Suggested [[wiki-links]] to create\n\n\
            Output your findings as a structured list.",
            vec![Message {
                role: "user".to_string(),
                content: format!(
                    "New source summary:\n{}\n\nExisting wiki context:\n{}",
                    summary, wiki_context
                ),
            }],
        )
        .await?;

    on_step(AgentStep {
        name: "Cross-Referencer".to_string(),
        status: "done".to_string(),
        output: cross_refs.chars().take(200).collect(),
    });

    // Step 3: Writer (produces the final article)
    on_step(AgentStep {
        name: "Writer".to_string(),
        status: "running".to_string(),
        output: String::new(),
    });

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let final_article = provider
        .complete(
            &format!(
                "You are a wiki article writer. Using the summary and cross-references provided, \
                write a complete wiki article following this format:\n\n\
                ===FILE: <slug>.md===\n\
                ---\n\
                title: \"<title>\"\n\
                categories: [\"<cat>\"]\n\
                sources: []\n\
                created: {}\n\
                updated: {}\n\
                status: draft\n\
                ---\n\n\
                # <title>\n\n\
                > One-paragraph summary\n\n\
                ## Overview\n\n\
                ...\n\n\
                ## Key Points\n\n\
                ...\n\n\
                ## Relationships\n\n\
                - **Related to**: [[other-article]]\n\n\
                ===END FILE===\n\n\
                Also output any index file updates (for _index.md, _concepts.md, _categories.md, _recent.md) \
                in the same ===FILE: ...=== format.\n\n\
                Use [[wiki-links]] for all cross-references identified.",
                today, today
            ),
            vec![Message {
                role: "user".to_string(),
                content: format!(
                    "Source summary:\n{}\n\nCross-references:\n{}\n\nWrite the wiki article now.",
                    summary, cross_refs
                ),
            }],
        )
        .await?;

    on_step(AgentStep {
        name: "Writer".to_string(),
        status: "done".to_string(),
        output: "Article generated".to_string(),
    });

    Ok(final_article)
}
