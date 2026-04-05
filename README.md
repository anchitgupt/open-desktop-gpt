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

### Core
- **Desktop app** — Tauri-based native app (macOS, Windows, Linux)
- **Multi-provider LLM** — Claude, OpenAI, Gemini, or Ollama (local, free)
- **Ingest anything** — URLs, files, clipboard, drag-and-drop, plain text
- **One-click compile** — Raw sources become wiki articles via LLM
- **Smart compilation** — Diff preview before writing, approve/reject changes
- **Multi-agent pipeline** — 3-agent compilation (summarizer, cross-referencer, writer) for deeper analysis

### Browse & Read
- **Article reader** — Full markdown rendering with syntax highlighting, TOC sidebar, backlinks
- **Knowledge graph** — Interactive force-directed visualization of article connections
- **Dashboard** — Stats cards, category chart, article maturity bar, orphan detection
- **Source manager** — Table view of all raw sources with preview, compile, delete, and bulk actions

### Search & Navigate
- **Cmd+K command palette** — Quick article search and navigation
- **Full-text search** — BM25 ranking via Tantivy (instant, no LLM needed)
- **Keyboard shortcuts** — Cmd+D (Dashboard), Cmd+G (Graph), Cmd+/ (Q&A), Cmd+I (Sources)

### Q&A
- **Chat interface** — Ask questions with streaming LLM responses grounded in your wiki
- **Wiki citations** — Responses include clickable `[[wiki-link]]` references
- **Multi-conversation** — Save, load, and manage multiple chat threads
- **File to wiki** — Save any Q&A answer back into the wiki as an article

### Polish
- **Setup wizard** — First-run onboarding with provider selection and connection test
- **Toast notifications** — Success/error feedback on all actions
- **Micro-interactions** — Page transitions, hover effects, animated indicators (Framer Motion)
- **Dark/light theme** — Manual toggle with system preference detection
- **Collapsible sidebar** — Smooth animation, state persisted
- **Obsidian-compatible** — Same `[[wiki-links]]`, open as an Obsidian vault
- **Memory tiering** — Articles progress through draft/review/published with auto-decay

### Developer Tools
- **CLI tools** — Python scripts for ingestion, search, stats, and export
- **GitHub Actions CI** — Cross-platform binary releases (.dmg, .msi, .AppImage, .deb)

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

On first launch, the **Setup Wizard** guides you through:

1. **Choose your LLM provider** — Claude, OpenAI, Gemini, or Ollama
2. **Enter your API key** (or Ollama endpoint for local models)
3. **Test connection** — Verify the LLM responds
4. **Try it** — Ingest a sample URL and watch it compile into a wiki article
5. **Done** — Start browsing, asking questions, or adding more sources

If you skip the wizard, configure the LLM later in Settings (gear icon in sidebar footer).

## How It Works

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Ingest  │────→│ Compile  │────→│  Browse   │
│          │     │          │     │          │
│ URL      │     │ LLM reads│     │ Articles │
│ File     │     │ source + │     │ Graph    │
│ Text     │     │ wiki     │     │ Search   │
│ Clipboard│     │ context  │     │ Q&A      │
└──────────┘     └──────────┘     └──────────┘
                      │                 │
                      │    ┌────────────┘
                      │    │ File answers
                      │    │ back to wiki
                      ▼    ▼
                 ┌──────────┐
                 │   Wiki   │
                 │ compounds│
                 │ over time│
                 └──────────┘
```

1. **Ingest** — Add raw sources via URL, file upload, or text paste. Sources are saved to `raw/` with metadata.
2. **Compile** — The LLM reads the source + existing wiki context and produces structured wiki articles with frontmatter, `[[wiki-links]]`, and source citations.
3. **Browse** — Articles appear in the sidebar. Read with full markdown rendering, table of contents, and backlinks.
4. **Ask** — Type questions in Q&A. The LLM answers grounded in your wiki with clickable citations.
5. **Compound** — File Q&A answers back to the wiki. The knowledge base grows with every interaction.

## App Pages

| Page | Shortcut | Description |
|------|----------|-------------|
| **Dashboard** | Cmd+D | Stats cards, category chart, maturity bar, orphan articles, recent compilations |
| **Knowledge Graph** | Cmd+G | Interactive force-directed graph — nodes are articles, edges are wiki-links |
| **Q&A** | Cmd+/ | Chat with your wiki — streaming responses, multi-conversation, save to wiki |
| **Sources** | Cmd+I | Manage raw sources — preview, filter by type/status, compile, delete, bulk actions |
| **Reader** | (click article) | Full article view — markdown rendering, TOC, backlinks, export |

## Architecture

```
open-desktop-gpt/
├── app/                        # Tauri + React desktop app
│   ├── src/                    # React frontend (Vite + TS + Tailwind + shadcn/ui)
│   │   ├── pages/              # Dashboard, Reader, QA, Graph, Inbox (Sources)
│   │   ├── components/         # Sidebar, CommandPalette, Settings, Ingest, Toast, SetupWizard
│   │   ├── hooks/              # useTauriCommand, useFileWatcher, useTheme, useToast
│   │   └── lib/                # Types, config types, utilities, motion tokens
│   └── src-tauri/              # Rust backend
│       └── src/
│           ├── wiki.rs         # Read articles, stats, backlinks, graph data
│           ├── ingest.rs       # URL fetch, file copy, text ingestion
│           ├── sources.rs      # Raw source listing, preview, deletion
│           ├── compile.rs      # LLM compilation pipeline (single + multi-agent)
│           ├── llm/            # Provider abstraction (Claude/OpenAI/Gemini/Ollama)
│           ├── search.rs       # Tantivy full-text search
│           ├── config.rs       # YAML config management
│           ├── conversations.rs # Q&A conversation persistence
│           ├── tiers.rs        # Memory tiering and auto-decay
│           ├── export.rs       # Markdown report + Marp slide export
│           └── watcher.rs      # File system watcher for live UI updates
├── raw/                        # Raw source documents (you add these)
│   ├── articles/               # Web articles, text notes (.md, .txt)
│   ├── papers/                 # Research papers (.pdf)
│   ├── datasets/               # Data files (.csv, .json)
│   ├── images/                 # Reference images (.png, .jpg)
│   └── repos/                  # Code repository notes
├── wiki/                       # Compiled wiki articles (LLM maintains these)
│   ├── _index.md               # Master article index
│   ├── _concepts.md            # Concept map
│   ├── _categories.md          # Category taxonomy
│   ├── _recent.md              # Recently updated articles
│   └── <topic-slug>.md         # Individual wiki articles
├── outputs/                    # Generated artifacts
│   ├── slides/                 # Marp-format slideshows
│   └── reports/                # Markdown reports
├── tools/                      # CLI helper scripts (Python)
├── .knowledge-gpt/             # Config and state
│   └── config.yaml             # LLM provider settings
├── CLAUDE.md                   # LLM compilation instructions
├── GUIDE.md                    # Comprehensive user guide
└── CONTRIBUTING.md             # Development setup and guidelines
```

**Tech stack:** Tauri 2.0 &middot; React 19 &middot; Vite 7 &middot; TypeScript &middot; TailwindCSS 4 &middot; shadcn/ui &middot; Framer Motion &middot; Rust &middot; Tantivy

## Configuration

### Via the app

Click the **gear icon** in the sidebar footer, or use the Setup Wizard on first launch.

| Setting | Description |
|---------|-------------|
| LLM Provider | Claude, OpenAI, Gemini, or Ollama |
| API Key | Your provider's API key |
| Model | Model identifier (e.g., `claude-sonnet-4-5-20250514`, `gpt-4o`, `gemma3:4b`) |
| Ollama Endpoint | Local URL (default `http://localhost:11434`) |
| Auto-compile | Automatically compile sources on ingest (default: on) |

### Via config file

Edit `.knowledge-gpt/config.yaml`:

```yaml
llm:
  provider: claude          # claude | openai | gemini | ollama
  api_key: sk-...           # Your API key
  model: claude-sonnet-4-5-20250514
  ollama_endpoint: http://localhost:11434
auto_compile: true
setup_completed: true
```

### Customizing compilation behavior

Edit `CLAUDE.md` at the project root. This file contains the LLM's compilation instructions — article format, linking conventions, citation style, and workflow definitions. Any LLM provider follows these instructions.

## CLI Tools

For power users who prefer the terminal:

```bash
# Install CLI dependencies (optional)
pip install -r requirements.txt

# Ingest sources
python tools/ingest.py url "https://example.com/article"
python tools/ingest.py file /path/to/paper.pdf
pbpaste | python tools/ingest.py clip

# Search wiki
python tools/search.py "transformer architecture"

# Wiki stats
python tools/stats.py

# Export
python tools/export.py slides article-name
```

## Obsidian Compatibility

Open the project folder as an Obsidian vault (**File > Open Vault > Select this folder**). Wiki articles use `[[wiki-links]]` for cross-references. The Obsidian graph view shows the same knowledge network as the app's Knowledge Graph. Both the desktop app and Obsidian read/write the same markdown files — edits in either are reflected live via the file watcher.

## Why Not RAG?

At the scale of a personal knowledge base, a well-structured markdown wiki with indexes and summaries is more effective than chunking + embeddings + vector search:

- **Human-readable** — Every claim traces to a `.md` file you can read
- **Self-healing** — LLM linting finds and fixes issues
- **Compounding** — Q&A outputs feed back into the wiki
- **Zero infrastructure** — No database, no server, just files
- **Obsidian-native** — Full backlink graph, search, visualization
- **Version-controlled** — Git tracks every change

## Documentation

- **[GUIDE.md](GUIDE.md)** — Comprehensive user guide with every feature explained
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Development setup and contribution guidelines
- **[CHANGELOG.md](CHANGELOG.md)** — Version history and release notes
- **[CLAUDE.md](CLAUDE.md)** — LLM compilation instructions (edit to customize behavior)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[Apache License 2.0](LICENSE) — Copyright 2026 [Anchit Gupta](https://github.com/anchitgupt)

## Acknowledgments

- Inspired by [Andrej Karpathy's LLM Knowledge Bases concept](https://x.com/karpathy/status/2039805659525644595)
- Built with [Tauri](https://tauri.app/), [React](https://react.dev/), and [Rust](https://www.rust-lang.org/)
