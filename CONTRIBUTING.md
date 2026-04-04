# Contributing to Open Desktop GPT

Thanks for your interest in contributing! Here's how to get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) toolchain
- One of: Claude API key, OpenAI API key, Gemini API key, or [Ollama](https://ollama.ai/) installed locally

## Development Setup

```bash
# Clone the repo
git clone https://github.com/anchitgupt/open-desktop-gpt.git
cd open-desktop-gpt

# Install frontend dependencies
cd app && pnpm install

# Launch in dev mode (first build compiles Rust — takes a few minutes)
pnpm tauri dev
```

## Project Structure

### Rust Backend (`app/src-tauri/src/`)

| File | Purpose |
|------|---------|
| `lib.rs` | Tauri command registration, project root detection |
| `wiki.rs` | Read wiki articles, stats, backlinks, orphan detection |
| `ingest.rs` | URL fetching and file ingestion into `raw/` |
| `config.rs` | YAML config read/write |
| `llm/` | Provider abstraction (Claude, OpenAI, Gemini, Ollama) |
| `compile.rs` | Send raw sources to LLM, parse response, write wiki articles |
| `watcher.rs` | File system watcher for live UI updates |

### React Frontend (`app/src/`)

| Directory | Purpose |
|-----------|---------|
| `pages/` | Dashboard, Reader, QA |
| `components/` | Sidebar, Layout, CommandPalette, SettingsDialog, IngestDialog, UncompiledList |
| `hooks/` | useTauriCommand, useFileWatcher, useTheme |
| `lib/` | Types, config types, utilities |
| `components/ui/` | shadcn/ui primitives (button, card, dialog, etc.) |

### Data Directories

| Directory | Purpose |
|-----------|---------|
| `raw/` | User-added source documents |
| `wiki/` | LLM-compiled wiki articles (markdown with YAML frontmatter) |
| `outputs/` | Generated artifacts (slides, charts, reports) |
| `.knowledge-gpt/` | Config (`config.yaml`) and compile log (`compile_log.jsonl`) |

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Verify both sides compile:
   ```bash
   cd app/src-tauri && cargo check    # Rust
   cd app && pnpm build               # Frontend
   ```
4. Submit a PR with a clear description of what changed and why

## Adding a New LLM Provider

1. Create `app/src-tauri/src/llm/your_provider.rs`
2. Implement the `LlmProvider` trait (`complete` + `stream_complete`)
3. Add `pub mod your_provider;` to `app/src-tauri/src/llm/mod.rs`
4. Add a match arm in `create_provider()` in `mod.rs`
5. Add the provider option to the Settings UI in `app/src/components/SettingsDialog.tsx`

## Reporting Issues

- **Bugs:** Include steps to reproduce, expected vs actual behavior, and your OS/platform
- **Features:** Describe the use case and proposed solution
