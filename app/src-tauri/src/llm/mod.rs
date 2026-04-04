pub mod claude;
pub mod openai;
pub mod gemini;
pub mod ollama;

use crate::config::LlmConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[async_trait::async_trait]
pub trait LlmProvider: Send + Sync {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String>;
    async fn stream_complete(
        &self,
        system: &str,
        messages: Vec<Message>,
        on_token: Box<dyn Fn(String) + Send>,
    ) -> Result<String, String>;
}

pub fn create_provider(config: &LlmConfig) -> Box<dyn LlmProvider> {
    match config.provider.as_str() {
        "openai" => Box::new(openai::OpenAiProvider::new(config)),
        "gemini" => Box::new(gemini::GeminiProvider::new(config)),
        "ollama" => Box::new(ollama::OllamaProvider::new(config)),
        _ => Box::new(claude::ClaudeProvider::new(config)),
    }
}
