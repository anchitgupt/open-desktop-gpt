use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;

pub struct OllamaProvider {
    endpoint: String,
    model: String,
}

impl OllamaProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            endpoint: if config.ollama_endpoint.is_empty() {
                "http://localhost:11434".to_string()
            } else {
                config.ollama_endpoint.clone()
            },
            model: if config.model.is_empty() {
                "llama3".to_string()
            } else {
                config.model.clone()
            },
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for OllamaProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();
        let mut msgs = vec![serde_json::json!({ "role": "system", "content": system })];
        for m in &messages {
            msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }
        let body = serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": false,
        });

        let url = format!("{}/api/chat", self.endpoint);
        let resp = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Parse failed: {}", e))?;

        json["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Unexpected response: {}", json))
    }

    async fn stream_complete(
        &self,
        system: &str,
        messages: Vec<Message>,
        on_token: Box<dyn Fn(String) + Send>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let mut msgs = vec![serde_json::json!({ "role": "system", "content": system })];
        for m in &messages {
            msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }
        let body = serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": true,
        });

        let url = format!("{}/api/chat", self.endpoint);
        let resp = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let mut stream = resp.bytes_stream();
        let mut full_text = String::new();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            // Ollama returns NDJSON: one JSON object per line
            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.is_empty() {
                    continue;
                }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(text) = json["message"]["content"].as_str() {
                        full_text.push_str(text);
                        on_token(text.to_string());
                    }
                    // Check if done
                    if json["done"].as_bool().unwrap_or(false) {
                        break;
                    }
                }
            }
        }
        Ok(full_text)
    }
}
