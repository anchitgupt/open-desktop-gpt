use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;

pub struct ClaudeProvider {
    api_key: String,
    model: String,
}

impl ClaudeProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            api_key: config.api_key.clone(),
            model: config.model.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for ClaudeProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();
        let msgs: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();

        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 8192,
            "system": system,
            "messages": msgs,
        });

        let resp = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Parse failed: {}", e))?;

        json["content"][0]["text"]
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
        let msgs: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();

        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 8192,
            "system": system,
            "messages": msgs,
            "stream": true,
        });

        let resp = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
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

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" {
                        continue;
                    }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if json["type"] == "content_block_delta" {
                            if let Some(text) = json["delta"]["text"].as_str() {
                                full_text.push_str(text);
                                on_token(text.to_string());
                            }
                        }
                    }
                }
            }
        }
        Ok(full_text)
    }
}
