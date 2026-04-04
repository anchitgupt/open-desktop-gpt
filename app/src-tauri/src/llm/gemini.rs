use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;

pub struct GeminiProvider {
    api_key: String,
    model: String,
}

impl GeminiProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            api_key: config.api_key.clone(),
            model: if config.model.is_empty() {
                "gemini-2.5-pro".to_string()
            } else {
                config.model.clone()
            },
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for GeminiProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();
        let contents: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                // Gemini uses "model" instead of "assistant"
                let role = if m.role == "assistant" { "model" } else { &m.role };
                serde_json::json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                })
            })
            .collect();

        let body = serde_json::json!({
            "system_instruction": {
                "parts": [{ "text": system }]
            },
            "contents": contents,
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );

        let resp = client
            .post(&url)
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Parse failed: {}", e))?;

        json["candidates"][0]["content"]["parts"][0]["text"]
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
        let contents: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                let role = if m.role == "assistant" { "model" } else { &m.role };
                serde_json::json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                })
            })
            .collect();

        let body = serde_json::json!({
            "system_instruction": {
                "parts": [{ "text": system }]
            },
            "contents": contents,
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
            self.model, self.api_key
        );

        let resp = client
            .post(&url)
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
                        if let Some(text) =
                            json["candidates"][0]["content"]["parts"][0]["text"].as_str()
                        {
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
