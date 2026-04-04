use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmConfig {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub ollama_endpoint: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub llm: LlmConfig,
    #[serde(default = "default_true")]
    pub auto_compile: bool,
}

fn default_true() -> bool {
    true
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            llm: LlmConfig {
                provider: "claude".to_string(),
                api_key: String::new(),
                model: "claude-sonnet-4-5-20250514".to_string(),
                ollama_endpoint: "http://localhost:11434".to_string(),
            },
            auto_compile: true,
        }
    }
}

pub fn load_config(root: &Path) -> AppConfig {
    let path = root.join(".knowledge-gpt").join("config.yaml");
    if let Ok(content) = fs::read_to_string(&path) {
        serde_yaml::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

pub fn save_config(root: &Path, config: &AppConfig) -> Result<(), String> {
    let dir = root.join(".knowledge-gpt");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("config.yaml");
    let yaml = serde_yaml::to_string(config).map_err(|e| e.to_string())?;
    fs::write(path, yaml).map_err(|e| e.to_string())
}
