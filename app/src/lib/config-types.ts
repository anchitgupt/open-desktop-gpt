export interface LlmConfig {
  provider: string;
  api_key: string;
  model: string;
  ollama_endpoint: string;
}

export interface AppConfig {
  llm: LlmConfig;
}
