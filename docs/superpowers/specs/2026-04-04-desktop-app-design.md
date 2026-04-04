# Knowledge GPT Desktop App — Design Spec

> **Date:** 2026-04-04
> **Status:** Approved
> **Stack:** Tauri 2.0 + React (Vite) + TypeScript + TailwindCSS + shadcn/ui

## 1. Overview

A single-user, local-only desktop application for the Knowledge GPT personal wiki system. The app provides a visual interface for browsing wiki articles, ingesting new sources, compiling raw sources into wiki articles via LLM, and asking questions against the knowledge base.

**Core principle:** Markdown files are the data store. No separate database. The app reads/writes the same `raw/` and `wiki/` directories that Obsidian, VS Code, and the CLI tools use. Zero lock-in.

## 2. Architecture

```
knowledge-gpt/
├── app/                        # Tauri + React desktop app
│   ├── src/                    # React frontend (Vite + TS)
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-level views
│   │   ├── providers/          # LLM provider abstraction (frontend types)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities (markdown parsing, etc.)
│   │   └── styles/             # Tailwind + global styles
│   ├── src-tauri/              # Rust backend
│   │   ├── src/
│   │   │   ├── commands/       # Tauri command handlers
│   │   │   ├── wiki/           # Wiki read/write/index operations
│   │   │   ├── ingest/         # Source ingestion (port of tools/ingest.py)
│   │   │   ├── llm/            # LLM provider abstraction
│   │   │   └── main.rs
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── package.json
│   └── vite.config.ts
├── raw/                        # (unchanged) Raw source documents
├── wiki/                       # (unchanged) Compiled wiki articles
├── outputs/                    # (unchanged) Generated artifacts
└── tools/                      # (unchanged) CLI tools remain for terminal use
```

### 2.1 Frontend (React + Vite + TypeScript)

Responsible for rendering the UI, calling Tauri commands, and displaying LLM-streamed responses.

- **React 18+** with functional components and hooks
- **Vite** for fast dev/build
- **TailwindCSS** for styling
- **shadcn/ui** for consistent, accessible component primitives
- **React Router** for client-side navigation between views
- **react-markdown** (or similar) for rendering wiki articles with full markdown support

### 2.2 Backend (Rust via Tauri 2.0)

Responsible for all file I/O, LLM API calls, ingestion logic, and file watching.

- Exposes functionality to the frontend via Tauri's `#[tauri::command]` IPC
- No HTTP server — all communication is Tauri IPC (fast, secure)
- File watcher runs as a background thread, emits events to frontend

## 3. Frontend — Pages & Layout

### 3.1 Shell Layout

Sidebar (fixed, left) + main content area. Similar to Notion/Obsidian.

**Sidebar contents:**
- Wiki article tree grouped by category (from `_categories.md`)
- "Uncompiled" badge — count of raw sources not yet compiled
- Quick links: Dashboard, Q&A
- Recent articles (from `_recent.md`)
- Drag-and-drop zone for file ingestion
- "Paste URL" button for URL ingestion
- Footer: gear icon (settings modal), theme toggle (light/dark, follows system default)

### 3.2 Pages

#### Dashboard
- **Stats cards:** total articles, total word count, categories count, uncompiled sources count
- **Category breakdown:** bar or pie chart showing article distribution
- **Recent compilations:** last 10 entries from `compile_log.jsonl` with timestamps
- **Health warnings:** orphan articles (no backlinks), stale articles (not updated recently), gaps (raw sources without wiki coverage)

#### Reader
- Renders a single wiki article from `wiki/<slug>.md`
- Full markdown rendering including tables, code blocks, math
- **Table of contents** sidebar (auto-generated from headings)
- **Backlinks panel** at the bottom — other articles that link to this one
- **Source attribution** — links to the raw sources that informed this article
- `[[wiki-links]]` are clickable and navigate within the app
- Edit button that opens the file in the system default editor (Obsidian/VS Code)

#### Q&A
- Chat interface for asking questions against the wiki
- LLM responses stream in real-time
- Responses include citations to wiki articles (clickable links to Reader)
- "File to wiki" button on any answer — saves the Q&A result as a new wiki article
- Chat history persisted locally in `.knowledge-gpt/chat_history.json`

#### Cmd+K Overlay
- Global keyboard shortcut (Cmd+K / Ctrl+K) opens a search/question overlay
- Type a question or search term
- Quick LLM-powered answer inline
- Option to "Open in Q&A" for deeper conversation
- Option to navigate directly to a matching wiki article

### 3.3 Ingestion UX

Ingestion is embedded in the sidebar, not a separate page:

- **Drag-and-drop:** Drop files onto the sidebar → Tauri command copies to appropriate `raw/` subdirectory
- **Paste URL:** Click button or Cmd+Shift+V → input field appears → paste URL → Tauri fetches and saves to `raw/articles/`
- **Uncompiled list:** Click the "Uncompiled" badge → dropdown/panel shows raw sources not yet compiled, each with a "Compile" button
- **Compile action:** Sends raw source to LLM with wiki context and CLAUDE.md instructions → LLM returns new/updated wiki markdown → Rust writes files → UI refreshes

### 3.4 Settings Modal

Accessed via gear icon in sidebar footer. Contains:

- **LLM Provider:** dropdown (Claude, OpenAI, Gemini, Ollama)
- **API Key:** text input (masked)
- **Model:** text input or dropdown based on provider
- **Ollama Endpoint:** text input (shown only when Ollama selected, defaults to `http://localhost:11434`)
- All settings read/written to `.knowledge-gpt/config.yaml`

## 4. Rust Backend — Tauri Commands

### 4.1 Wiki Operations

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `list_articles` | — | `Vec<ArticleMeta>` | All wiki articles with title, slug, category, status, word count, updated date |
| `read_article` | `slug: String` | `Article` | Parsed frontmatter + markdown body for a single article |
| `get_index_files` | — | `IndexFiles` | Contents of `_index.md`, `_concepts.md`, `_categories.md`, `_recent.md` |
| `get_stats` | — | `WikiStats` | Article count, word count, category breakdown, orphan list, stale list |

### 4.2 Ingestion

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `ingest_url` | `url: String` | `IngestResult` | Fetch URL, parse to markdown, save to `raw/articles/` |
| `ingest_file` | `path: String` | `IngestResult` | Copy file to appropriate `raw/` subdirectory |
| `list_uncompiled` | — | `Vec<RawSource>` | Raw files not yet in `compile_log.jsonl` |

### 4.3 LLM Operations

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `compile` | `raw_paths: Vec<String>` | `CompileResult` | Send raw sources + wiki context to LLM, write results to `wiki/`, update indexes, log action |
| `ask` | `question: String` | Streamed `String` | Send question + relevant wiki context to LLM, stream response |
| `file_answer` | `question: String, answer: String` | `Article` | Save Q&A result as a new wiki article |

### 4.4 Config

| Command | Input | Output | Description |
|---------|-------|--------|-------------|
| `get_config` | — | `AppConfig` | Read `.knowledge-gpt/config.yaml` |
| `set_config` | `config: AppConfig` | — | Write to `.knowledge-gpt/config.yaml` |

### 4.5 File Watcher

- Background thread using `notify` crate watches `raw/` and `wiki/` directories
- On file create/modify/delete, emits a Tauri event (`wiki-changed`, `raw-changed`) to the frontend
- Frontend listens for these events and refreshes the relevant data (article list, uncompiled count, etc.)

## 5. LLM Provider Abstraction

### 5.1 Provider Trait

```rust
trait LlmProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String>;
    async fn stream_complete(&self, system: &str, messages: Vec<Message>) -> Result<Stream<String>>;
}
```

### 5.2 Implementations

| Provider | Auth | Endpoint |
|----------|------|----------|
| `ClaudeProvider` | Anthropic API key | `https://api.anthropic.com/v1/messages` |
| `OpenAiProvider` | OpenAI API key | `https://api.openai.com/v1/chat/completions` |
| `GeminiProvider` | Google API key | `https://generativelanguage.googleapis.com/v1beta/models/` |
| `OllamaProvider` | None | Configurable local endpoint (default `http://localhost:11434`) |

### 5.3 Prompt Strategy

**Compilation:** System prompt is built from CLAUDE.md instructions (wiki article format, linking rules, compilation style). User message includes the raw source content + summaries of existing related wiki articles for context. LLM returns complete markdown file(s) to write. No streaming — batch write after response completes.

**Q&A:** System prompt instructs the LLM to answer grounded in wiki content with `[[wiki-link]]` citations. User message includes the question + content of the most relevant wiki articles (matched by title/category against the question using `_index.md`). Streaming enabled for real-time response in the chat UI.

### 5.4 Config

```yaml
llm:
  provider: claude          # claude | openai | gemini | ollama
  api_key: ""               # API key for claude/openai/gemini
  model: claude-sonnet-4-5  # Model identifier
  ollama_endpoint: http://localhost:11434  # Only used for ollama provider
```

## 6. Data Flow

### 6.1 Ingest Flow
```
User pastes URL / drops file
  → Tauri ingest command (fetch + parse + save to raw/)
  → File watcher detects new file in raw/
  → Frontend updates "Uncompiled" badge count
```

### 6.2 Compile Flow
```
User clicks "Compile" on an uncompiled source
  → Rust reads raw file content
  → Rust reads _index.md + related wiki articles for context
  → Rust reads CLAUDE.md for compilation instructions
  → Sends to LLM provider
  → LLM returns new/updated wiki markdown
  → Rust writes to wiki/, updates _index.md, _concepts.md, _categories.md, _recent.md
  → Rust appends to compile_log.jsonl
  → File watcher triggers UI refresh
```

### 6.3 Q&A Flow
```
User types question (Q&A page or Cmd+K)
  → Rust reads _index.md, selects relevant articles
  → Sends question + context to LLM provider (streaming)
  → Frontend renders streamed response with [[wiki-link]] citations
  → User optionally clicks "File to wiki"
    → Rust writes answer as new wiki article
    → Updates index files
```

### 6.4 Browse Flow
```
User clicks article in sidebar
  → Rust reads wiki/<slug>.md, parses frontmatter + body
  → Frontend renders markdown with TOC, backlinks, source links
  → [[wiki-links]] are clickable, navigate within the app
```

### 6.5 External Edit Detection
```
User edits a file in Obsidian / VS Code / Finder
  → File watcher (notify crate) detects change
  → Emits Tauri event to frontend
  → Frontend refreshes affected data
```

## 7. Design Language

- **Typography:** Clean, readable. System font stack for UI, proportional serif or sans-serif for article body
- **Layout:** Sidebar (240px fixed) + main content area
- **Component library:** shadcn/ui for buttons, inputs, dropdowns, modals, cards
- **Theme:** Light and dark mode, follows system preference by default, manual toggle in sidebar footer
- **Dashboard:** Card-based stats, small charts (category breakdown), activity list
- **Reader:** Notion-like article rendering — generous whitespace, clear heading hierarchy, inline code styling
- **Q&A:** Chat bubble layout, monospace for code in responses

## 8. Build Phases (Suggested)

To keep this manageable, build incrementally:

1. **Phase 1 — Skeleton:** Tauri + React scaffold, sidebar layout, file reading, article list, Reader page
2. **Phase 2 — Dashboard:** Stats, category breakdown, health warnings from existing wiki/index files
3. **Phase 3 — Ingestion:** URL/file ingestion via Tauri commands, uncompiled list, drag-and-drop
4. **Phase 4 — LLM Integration:** Provider abstraction, compilation flow, Q&A chat, Cmd+K overlay
5. **Phase 5 — Polish:** File watcher, theme toggle, settings modal, error handling, keyboard shortcuts

## 9. Non-Goals

- Multi-user support or authentication
- Cloud sync or remote storage
- Mobile app
- Custom editor within the app (use Obsidian/VS Code for editing)
- Semantic/vector search (LLM handles search)
- Distribution/packaging for other users
