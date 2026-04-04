use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
    pub created: String,
    pub updated: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationMeta {
    pub id: String,
    pub title: String,
    pub message_count: usize,
    pub updated: String,
}

fn conversations_dir(root: &Path) -> std::path::PathBuf {
    root.join(".knowledge-gpt").join("conversations")
}

pub fn list_conversations(root: &Path) -> Vec<ConversationMeta> {
    let dir = conversations_dir(root);
    if !dir.exists() {
        return Vec::new();
    }

    let mut convos: Vec<ConversationMeta> = fs::read_dir(&dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
                .filter_map(|e| {
                    let content = fs::read_to_string(e.path()).ok()?;
                    let convo: Conversation = serde_json::from_str(&content).ok()?;
                    Some(ConversationMeta {
                        id: convo.id,
                        title: convo.title,
                        message_count: convo.messages.len(),
                        updated: convo.updated,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    convos.sort_by(|a, b| b.updated.cmp(&a.updated));
    convos
}

pub fn load_conversation(root: &Path, id: &str) -> Option<Conversation> {
    let path = conversations_dir(root).join(format!("{}.json", id));
    let content = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_conversation(root: &Path, convo: &Conversation) -> Result<(), String> {
    let dir = conversations_dir(root);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.json", convo.id));
    let json = serde_json::to_string_pretty(convo).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn delete_conversation(root: &Path, id: &str) -> Result<(), String> {
    let path = conversations_dir(root).join(format!("{}.json", id));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

pub fn create_conversation(root: &Path) -> Result<Conversation, String> {
    let now = Utc::now();
    let id = format!("{}", now.timestamp_millis());
    let convo = Conversation {
        id,
        title: "New conversation".to_string(),
        messages: Vec::new(),
        created: now.to_rfc3339(),
        updated: now.to_rfc3339(),
    };
    save_conversation(root, &convo)?;
    Ok(convo)
}
