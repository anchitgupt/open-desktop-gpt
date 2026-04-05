# Open Desktop GPT

**Your LLM compiles the wiki. You read it.**

A desktop app that turns raw sources into a structured, interlinked knowledge base — powered by any LLM. Inspired by [Andrej Karpathy's insight](https://x.com/karpathy/status/2039805659525644595) that at personal scale, structured markdown + an LLM compiler beats RAG.

## What is this?

```
raw/ sources ──→ LLM "compiles" ──→ wiki/ (structured .md)
                                         ↑
                    Q&A, linting, ←───────┘
                    explorations
                    get filed back
```

You drop in raw sources — articles, papers, PDFs, URLs. The LLM reads them and compiles a structured, interlinked wiki with frontmatter, citations, and cross-references. You ask questions; the answers get filed back. The wiki compounds over time.

No RAG. No vector DB. No embeddings. Just markdown files and an LLM.

## Features

- **Desktop app** — Tauri-based native app with sidebar, markdown reader, and dashboard
- **Multi-provider LLM** — Claude, OpenAI, Gemini, or Ollama (local)
- **Ingest anything** — URLs, files, clipboard, drag-and-drop
- **One-click compile** — Raw sources become wiki articles via LLM
- **Q&A chat** — Ask questions with streaming responses and `[[wiki-link]]` citations
- **Cmd+K search** — Quick navigation overlay
- **Live updates** — File watcher refreshes the UI on external edits
- **Dark/light theme** — System preference detection with manual toggle
- **Obsidian-compatible** — Same `[[wiki-links]]`, open as an Obsidian vault
- **CLI tools** — Power-user scripts for ingestion, search, stats, and export

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) toolchain (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- An LLM API key (Claude, OpenAI, or Gemini) **or** [Ollama](https://ollama.ai/) installed locally

### Install and run

```bash
# Clone the repo
git clone https://github.com/anchitgupt/open-desktop-gpt.git
cd open-desktop-gpt

# Install frontend dependencies
cd app && pnpm install

# Launch the app (first build compiles Rust — takes a few minutes)
pnpm tauri dev
```

### First use

1. Click the **gear icon** in the sidebar footer to open Settings
2. Select your LLM provider and enter your API key
3. Click **"+ Paste URL"** in the sidebar and ingest an article
4. Click **Uncompiled** to expand the list, then click **Compile**
5. Browse the compiled article in the sidebar, or ask a question in **Q&A**

## Screenshots

<!-- Screenshots will be added after first release -->

| Dashboard | Reader | Q&A | Cmd+K |
|-----------|--------|-----|-------|
| *Stats, charts, health warnings* | *Markdown with TOC, backlinks* | *Streaming chat with citations* | *Quick article search* |

## How It Works

1. **Ingest** — Drop raw sources (URLs, files, PDFs) into the app or the `raw/` directory
2. **Compile** — Click "Compile" — the LLM reads the source + existing wiki context and outputs structured wiki articles with frontmatter, `[[wiki-links]]`, and source citations
3. **Browse** — Articles appear in the sidebar with full markdown rendering, table of contents, and backlinks
4. **Ask** — Type questions in Q&A — the LLM answers grounded in your wiki, with clickable citations
5. **Compound** — File Q&A answers back to the wiki. The knowledge base grows with every interaction

## Architecture

```
open-desktop-gpt/
├── app/                        # Tauri + React desktop app
│   ├── src/                    # React frontend (Vite + TS + Tailwind + shadcn/ui)
│   │   ├── pages/              # Dashboard, Reader, QA
│   │   ├── components/         # Sidebar, CommandPalette, Settings, Ingest
│   │   └── hooks/              # useTauriCommand, useFileWatcher, useTheme
│   └── src-tauri/              # Rust backend
│       └── src/
│           ├── wiki.rs         # Read articles, stats, backlinks
│           ├── ingest.rs       # URL fetch, file ingestion
│           ├── compile.rs      # LLM compilation pipeline
│           ├── llm/            # Provider abstraction (Claude/OpenAI/Gemini/Ollama)
│           ├── config.rs       # YAML config management
│           └── watcher.rs      # File system watcher
├── raw/                        # Raw source documents (you add these)
├── wiki/                       # Compiled wiki articles (LLM maintains these)
├── outputs/                    # Generated artifacts (slides, charts, reports)
├── tools/                      # CLI helper scripts (Python)
├── .knowledge-gpt/             # Config and state
│   └── config.yaml             # LLM provider settings
└── CLAUDE.md                   # LLM compilation instructions
```

**Tech stack:** Tauri 2.0 &middot; React 18 &middot; Vite &middot; TypeScript &middot; TailwindCSS &middot; shadcn/ui &middot; Rust

## CLI Tools

For power users who prefer the terminal:

| Tool | Description |
|------|-------------|
| `python tools/ingest.py url <URL>` | Fetch a web page, convert to markdown, save to `raw/` |
| `python tools/ingest.py file <path>` | Copy a local file into `raw/` |
| `python tools/ingest.py clip` | Ingest from clipboard (`pbpaste \| python tools/ingest.py clip`) |
| `python tools/ingest.py youtube <URL>` | Save YouTube video reference |
| `python tools/search.py "query"` | Full-text TF-IDF search over wiki |
| `python tools/stats.py` | Wiki statistics and health overview |
| `python tools/export.py slides <article>` | Generate Marp-format slideshow |

```bash
# Install CLI dependencies (optional)
pip install -r requirements.txt
```

## Configuration

### Via the app

Click the gear icon in the sidebar footer. Select your provider, enter your API key, choose a model.

### Via config file

Edit `.knowledge-gpt/config.yaml`:

```yaml
llm:
  provider: claude          # claude | openai | gemini | ollama
  api_key: sk-...           # Your API key
  model: claude-sonnet-4-5-20250514
  ollama_endpoint: http://localhost:11434
```

### Wiki settings

```yaml
wiki:
  name: "My Knowledge Base"
  scope: "General research and learning"
  style: technical          # academic | casual | technical

compilation:
  auto_reindex: true
  auto_backlink: true
```

## Obsidian Compatibility

Open the project folder as an Obsidian vault (**File > Open Vault > Select this folder**). Wiki articles use `[[wiki-links]]` for cross-references. The Obsidian graph view shows the knowledge network. Both the desktop app and Obsidian read/write the same markdown files — use whichever you prefer.

## Why Not RAG?

Karpathy's key insight: at the scale of a personal knowledge base, a well-structured markdown wiki with indexes and summaries is **more effective** than chunking + embeddings + vector search:

- **Human-readable** — Every claim traces to a `.md` file you can read
- **Self-healing** — LLM linting finds and fixes issues
- **Compounding** — Q&A outputs feed back into the wiki
- **Zero infrastructure** — No database, no server, just files
- **Obsidian-native** — Full backlink graph, search, visualization

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[Apache License 2.0](LICENSE) — Copyright 2026 [Anchit Gupta](https://github.com/anchitgupt)

## Acknowledgments

- Inspired by [Andrej Karpathy's LLM Knowledge Bases concept](https://x.com/karpathy/status/2039805659525644595)
- Built with [Tauri](https://tauri.app/), [React](https://react.dev/), and [Rust](https://www.rust-lang.org/)
