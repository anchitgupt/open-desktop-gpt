# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-04-05

### Added

- Desktop app (Tauri 2.0 + React) with sidebar navigation, dashboard, article reader, and Q&A chat
- Multi-provider LLM support: Claude (Anthropic), OpenAI, Gemini (Google), Ollama (local)
- URL and file ingestion with drag-and-drop support
- One-click compilation of raw sources into structured wiki articles via LLM
- Q&A chat with streaming LLM responses and `[[wiki-link]]` citations
- "File to wiki" button to save Q&A answers as wiki articles
- Cmd+K command palette for quick article search and navigation
- File watcher for live UI updates when files change externally (Obsidian, VS Code, etc.)
- Dark/light theme toggle with system preference detection
- Settings modal for LLM provider configuration
- Dashboard with stats cards, category breakdown chart, orphan detection, and health warnings
- Article reader with full markdown rendering, table of contents, backlinks panel, and source attribution
- CLI tools: ingest (URL, file, clipboard, YouTube), search (TF-IDF), stats, export (Marp slides)
- Obsidian-compatible `[[wiki-link]]` format throughout
