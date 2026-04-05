# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-04-05

### Added

- First-run setup wizard with provider selection, API key validation, and sample ingest
- Toast notification system for success/error feedback across all actions
- Enhanced empty states with icons and action buttons on Dashboard, Q&A, Graph
- Skeleton loading states for sidebar article list
- Collapsible sidebar with smooth width transition
- GitHub Actions CI for cross-platform binary releases (.dmg, .msi, .AppImage, .deb)

### Changed

- Ingest, compile, export, and settings actions now show toast notifications instead of silent failures
- EmptyState component supports Lucide icons
- Config schema includes `setup_completed` flag and `test_connection` command

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
