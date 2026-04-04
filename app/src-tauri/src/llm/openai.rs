use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;

pub struct OpenAiProvider {
    api_key: String,
    model: String,
}

impl OpenAiProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            api_key: config.api_key.clone(),
            model: if config.model.is_empty() {
                "gpt-4o".to_string()
            } else {
                config.model.clone()
            },
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for OpenAiProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();
        let mut msgs = vec![serde_json::json!({ "role": "system", "content": system })];
        for m in &messages {
            msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }
        let body = serde_json::json!({ "model": self.model, "messages": msgs });
        let resp = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Parse failed: {}", e))?;
        json["choices"][0]["message"]["content"]
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
        let body =
            serde_json::json!({ "model": self.model, "messages": msgs, "stream": true });
        let resp = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
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
                        if let Some(text) = json["choices"][0]["delta"]["content"].as_str() {
                            full_text.push_str(text);
                            on_token(text.to_string());
                        }
                    }
                }
            }
        }
        Ok(full_text)
    }
}
