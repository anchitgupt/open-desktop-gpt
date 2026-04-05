# Open Desktop GPT — User Guide

A complete walkthrough of every feature in the app.

---

## Table of Contents

1. [Installation](#1-installation)
2. [First Launch & Setup](#2-first-launch--setup)
3. [The Sidebar](#3-the-sidebar)
4. [Adding Sources](#4-adding-sources)
5. [Compiling Sources into Wiki Articles](#5-compiling-sources-into-wiki-articles)
6. [Browsing Articles (Reader)](#6-browsing-articles-reader)
7. [Dashboard](#7-dashboard)
8. [Q&A Chat](#8-qa-chat)
9. [Knowledge Graph](#9-knowledge-graph)
10. [Search](#10-search)
11. [Exporting Articles](#11-exporting-articles)
12. [Command Palette (Cmd+K)](#12-command-palette-cmdk)
13. [Keyboard Shortcuts](#13-keyboard-shortcuts)
14. [Settings & Configuration](#14-settings--configuration)
15. [Using with Obsidian](#15-using-with-obsidian)
16. [CLI Tools](#16-cli-tools)
17. [Memory Tiering](#17-memory-tiering)
18. [Multi-Agent Compilation](#18-multi-agent-compilation)
19. [Tips & Best Practices](#19-tips--best-practices)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Installation

### Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| Node.js 18+ | Frontend build | [nodejs.org](https://nodejs.org/) |
| pnpm | Package manager | `npm install -g pnpm` |
| Rust toolchain | Backend (Tauri) | [rustup.rs](https://rustup.rs/) |
| LLM provider | Powers compilation & Q&A | See [Setting up an LLM](#setting-up-an-llm) |

### Clone and Run

```bash
git clone https://github.com/anchitgupt/open-desktop-gpt.git
cd open-desktop-gpt/app
pnpm install
pnpm tauri dev
```

The first build compiles all Rust dependencies — this takes 3-5 minutes. Subsequent launches are fast (~5 seconds).

### Setting Up an LLM

You need at least one of these:

| Provider | What you need | Cost |
|----------|--------------|------|
| **Ollama** (recommended for trying) | [Install Ollama](https://ollama.ai/), then `ollama pull gemma3:4b` | Free, runs locally |
| **Claude** (Anthropic) | API key from [console.anthropic.com](https://console.anthropic.com/) | Pay per token |
| **OpenAI** | API key from [platform.openai.com](https://platform.openai.com/) | Pay per token |
| **Gemini** (Google) | API key from [aistudio.google.com](https://aistudio.google.com/) | Free tier available |

---

## 2. First Launch & Setup

When you first open the app, you'll see the Setup Wizard:

1. **Welcome screen** — Click "Let's get started"
2. **Provider selection** — Choose your LLM provider and enter your API key
   - For Ollama: select "Ollama", enter model name (e.g., `gemma3:4b`), endpoint defaults to `http://localhost:11434`
   - For cloud providers: paste your API key
3. **Test connection** — Click "Test Connection" to verify it works
4. **Done** — You're ready to go

If you skip the wizard, you can configure the LLM later in Settings (gear icon in the sidebar footer).

---

## 3. The Sidebar

The sidebar is your navigation hub. It has three sections:

### Header
Shows "Open Desktop GPT" with a live count of articles and total words in your wiki.

### Navigation
- **Dashboard** — Stats and health overview
- **Graph** — Visual knowledge graph
- **Q&A** — Chat with your wiki

### Tabs

| Tab | Purpose |
|-----|---------|
| **Browse** | Filter and browse your wiki articles, grouped by category |
| **Inbox** | View uncompiled sources waiting to be processed |
| **Search** | Full-text search powered by Tantivy (instant, no LLM needed) |

### Footer
Three controls:
- **Settings** (gear icon) — LLM provider, API key, model, auto-compile toggle
- **+ Add source** — Opens the source ingestion dialog
- **Theme toggle** (sun/moon icon) — Switch between light and dark mode

---

## 4. Adding Sources

Click **"+ Add source"** in the sidebar footer (or press the button in the Inbox tab). The dialog has three tabs:

### URL Tab
1. Paste a web URL (article, blog post, documentation page)
2. Click "Ingest URL"
3. The app fetches the page, extracts the content, strips HTML, and saves it to `raw/articles/` as markdown with frontmatter

**Example URLs to try:**
- A Wikipedia article
- A blog post
- Technical documentation

### File Tab
1. Click "Click to select files"
2. A native OS file picker opens
3. Select one or more files (.md, .pdf, .txt, .csv, .json, images)
4. Files are copied to the appropriate `raw/` subdirectory based on type:
   - `.md`, `.txt` → `raw/articles/`
   - `.pdf` → `raw/papers/`
   - `.csv`, `.json` → `raw/datasets/`
   - `.png`, `.jpg`, etc. → `raw/images/`

### Text Tab
1. Enter a title (optional, defaults to "Untitled Note")
2. Paste or type content in the textarea
3. Click "Add to Knowledge Base"
4. Content is saved as a markdown file in `raw/articles/`

**Auto-compile:** If enabled in Settings (on by default), sources are automatically compiled into wiki articles right after ingestion. You'll see "Ingesting..." → "Compiling..." in the dialog.

---

## 5. Compiling Sources into Wiki Articles

Compilation is the core workflow — the LLM reads your raw sources and writes structured wiki articles.

### Automatic Compilation
With auto-compile enabled (Settings → "Auto-compile on ingest"), sources compile immediately after ingestion. No clicks needed.

### Manual Compilation
1. Go to the **Inbox** tab in the sidebar
2. You'll see uncompiled sources listed
3. Click **"Compile"** next to any source for a single compile
4. Click **"Compile All"** to process everything at once

### Smart Compilation (Diff Preview)
When you click "Compile" on a single source:
1. The LLM generates proposed wiki articles
2. A **preview dialog** appears showing what will be created or updated
3. Each proposed file shows:
   - Filename
   - **NEW** badge (new article) or **UPDATE** badge (modifying existing)
   - Content preview
4. Uncheck any files you don't want
5. Click **"Apply N change(s)"** to write the approved files

### What the LLM does during compilation
1. Reads the raw source
2. Reads existing `_index.md` and `_concepts.md` for context
3. Reads `CLAUDE.md` for compilation instructions
4. Decides: new article or update to an existing one?
5. Writes the article with:
   - YAML frontmatter (title, categories, sources, dates, status)
   - Structured headings (Overview, Key Points, Relationships)
   - `[[wiki-links]]` to related articles
   - Source citations
6. Updates index files (`_index.md`, `_concepts.md`, `_categories.md`, `_recent.md`)

---

## 6. Browsing Articles (Reader)

Click any article in the sidebar's Browse tab to open it in the Reader.

### Article Header
- **Title** — Large, bold heading
- **Status badge** — Green pill (published), blue (review), gray (draft)
- **Category badges** — Blue pills showing article categories
- **Updated date** — When the article was last modified
- **Edit button** — Opens the markdown file in your default editor (VS Code, Obsidian, etc.)
- **Export button** — Export to Markdown report or Marp slides

### Article Body
Full markdown rendering with:
- GitHub-Flavored Markdown (tables, task lists, strikethrough)
- Syntax-highlighted code blocks
- `[[wiki-links]]` rendered as clickable internal links
- Heading anchors for deep linking

### Table of Contents
On wider screens, a sticky sidebar on the right shows:
- Auto-generated from article headings
- Click to jump to any section
- Hierarchical indentation

### Sources
At the bottom, a list of raw source files that informed this article (monospace paths).

### Backlinks
Below sources, pill-shaped links to other articles that reference this one via `[[wiki-links]]`. Click to navigate.

---

## 7. Dashboard

The home screen showing your knowledge base at a glance.

### Stats Cards
Four cards across the top:
- **Articles** — Total wiki article count
- **Total Words** — Combined word count across all articles
- **Categories** — Number of distinct categories
- **Uncompiled** — Raw sources waiting to be compiled

### Article Maturity Bar
A color bar showing the distribution of article tiers:
- **Green** — Published (mature, reviewed)
- **Blue** — In review
- **Gray** — Draft (new, unreviewed)
- **Amber** — Stale count (not updated in 30+ days)

### Category Chart
A bar chart showing article count per category. Hover for exact counts.

### Health Sections (two-column)
- **Recent Compilations** — Last 10 compilation events with dates
- **Orphan Articles** — Articles not linked from any other article (clickable to navigate)

---

## 8. Q&A Chat

An AI chat interface grounded in your wiki content.

### Starting a Conversation
1. Navigate to Q&A (sidebar or Cmd+/)
2. Type a question in the input box
3. Press Enter or click the send button

### How it works
1. Your question is sent to the LLM
2. The LLM receives your wiki's `_index.md` + up to 5 relevant articles as context
3. The response streams in real-time with a typing indicator
4. Responses include `[[wiki-links]]` — click them to jump to referenced articles

### Conversations
The left panel shows your conversation history:
- **+ New chat** — Start a fresh conversation
- Click any conversation to resume it
- Hover and click **x** to delete a conversation
- Conversations auto-save after each message
- Titles auto-set to your first question (truncated to 40 chars)

### Save to Wiki
Below each assistant response, click **"Save to wiki"** to file the answer as a new wiki article. A toast notification confirms it was saved.

### Example Questions
- "What topics do I have in my wiki?"
- "Summarize everything about [topic]"
- "What are the key differences between [A] and [B]?"
- "What open questions remain in my knowledge base?"
- "How does [concept A] relate to [concept B]?"

---

## 9. Knowledge Graph

A visual map of your wiki's structure.

### The Graph
- **Nodes** = Wiki articles (circles)
- **Edges** = `[[wiki-links]]` between articles
- **Node size** = Proportional to article word count
- **Node color** = By category (see legend at top)

### Interactions
- **Hover** a node to see the article title
- **Click** a node to navigate to that article in the Reader
- **Drag** nodes to rearrange the layout
- **Scroll** to zoom in/out
- **Pan** by dragging the background

### What it reveals
- **Hub articles** — Large, highly-connected nodes are your core topics
- **Orphans** — Isolated nodes with no connections need cross-referencing
- **Clusters** — Groups of connected articles show knowledge domains
- **Bridges** — Articles connecting two clusters are important interdisciplinary links

---

## 10. Search

Two search mechanisms:

### Sidebar Search Tab
1. Click the **Search** tab in the sidebar
2. Type your query
3. Results appear instantly (300ms debounce)
4. Each result shows:
   - Article title
   - Content snippet (first 150 characters matching)
5. Click a result to open it in the Reader
6. If no results: "Ask in Q&A →" link to ask the LLM instead

**Powered by Tantivy** — BM25 full-text search running locally in Rust. No LLM calls, no network, instant results.

### Cmd+K Command Palette
1. Press **Cmd+K** (or Ctrl+K)
2. Type to filter articles by title or category
3. Use **arrow keys** to navigate, **Enter** to select
4. If no match: "Ask in Q&A" action
5. Empty query shows quick actions (Dashboard, Q&A)

---

## 11. Exporting Articles

Export any wiki article from the Reader page.

### How to Export
1. Open an article in the Reader
2. Click the **Export** button (download icon, next to Edit)
3. Choose a format:
   - **Markdown Report** — Clean markdown with metadata header, saved to `outputs/reports/`
   - **Marp Slides** — Presentation slide deck, saved to `outputs/slides/`

### Markdown Report
A standalone markdown file with:
- Article title and export date
- Full article body
- Categories, status, and sources as footer metadata

### Marp Slides
A [Marp](https://marp.app/)-format slide deck:
- Title slide with article name and categories
- One slide per `##` heading in the article
- Ready to render with Marp CLI or the Obsidian Marp plugin

---

## 12. Command Palette (Cmd+K)

A Spotlight/Raycast-style quick launcher.

| Action | How |
|--------|-----|
| Open it | `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) |
| Search articles | Type article name or category |
| Navigate | Arrow keys ↑↓, Enter to select |
| Ask in Q&A | Type a question, press Enter when no articles match |
| Quick actions | Dashboard, Q&A (shown when query is empty) |
| Close | `Esc` or click outside |

---

## 13. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette |
| `Cmd+D` | Go to Dashboard |
| `Cmd+G` | Go to Knowledge Graph |
| `Cmd+/` | Go to Q&A |

All shortcuts use `Ctrl` instead of `Cmd` on Windows/Linux. Shortcuts are disabled when typing in input fields or textareas.

---

## 14. Settings & Configuration

### Via the App
Click the **gear icon** in the sidebar footer.

| Setting | Description |
|---------|-------------|
| **LLM Provider** | Claude, OpenAI, Gemini, or Ollama |
| **API Key** | Your provider's API key (hidden when Ollama selected) |
| **Model** | Model identifier (e.g., `claude-sonnet-4-5-20250514`, `gpt-4o`, `gemma3:4b`) |
| **Ollama Endpoint** | Local URL (default `http://localhost:11434`, only shown for Ollama) |
| **Auto-compile** | Toggle automatic compilation on ingest (default: on) |

### Via Config File
Edit `.knowledge-gpt/config.yaml` directly:

```yaml
llm:
  provider: claude          # claude | openai | gemini | ollama
  api_key: sk-...           # Your API key
  model: claude-sonnet-4-5-20250514
  ollama_endpoint: http://localhost:11434
auto_compile: true

wiki:
  name: "My Knowledge Base"
  scope: "General research and learning"
  style: technical          # academic | casual | technical
```

### Customizing the LLM's Behavior
Edit `CLAUDE.md` at the project root. This file contains:
- Compilation rules (article format, linking conventions, citation style)
- Workflows (compile, Q&A, lint, index, export)
- Wiki article template

Any LLM (Claude, GPT, Gemini, Ollama models) follows these instructions when compiling or answering questions.

---

## 15. Using with Obsidian

Open Desktop GPT and Obsidian work on the same files simultaneously.

### Setup
1. Open Obsidian
2. **File → Open Vault → Select folder** — choose the `open-desktop-gpt` project root
3. Both apps now read/write the same `wiki/` directory

### What works
- **Wiki-links** — `[[article-name]]` syntax is Obsidian-native
- **Graph view** — Obsidian's graph view shows the same connections as the app's Knowledge Graph
- **Live sync** — Edit in Obsidian, the desktop app refreshes automatically (file watcher)
- **Frontmatter** — The YAML frontmatter (title, categories, status) is readable by Obsidian plugins like Dataview

### Recommended Obsidian Plugins
- **Dataview** — Query article frontmatter (e.g., "show all draft articles")
- **Graph Analysis** — Advanced graph metrics beyond the built-in graph view
- **Marp** — Render exported slide decks directly in Obsidian
- **Web Clipper** — Browser extension to clip web articles directly to `raw/articles/`

---

## 16. CLI Tools

For power users who prefer the terminal. Requires Python: `pip install -r requirements.txt`

### Ingest
```bash
# Ingest a web URL
python tools/ingest.py url "https://example.com/article"

# Ingest a local file
python tools/ingest.py file /path/to/paper.pdf

# Ingest from clipboard
pbpaste | python tools/ingest.py clip

# Ingest YouTube video reference
python tools/ingest.py youtube "https://youtube.com/watch?v=..."
```

### Search
```bash
# Full-text search
python tools/search.py "transformer architecture"

# List all articles
python tools/search.py --list
```

### Stats
```bash
# Wiki overview
python tools/stats.py

# Show backlink graph
python tools/stats.py --backlinks
```

### Export
```bash
# Generate Marp slides
python tools/export.py slides article-name

# Generate chart script
python tools/export.py chart article-name

# Validate Obsidian compatibility
python tools/export.py obsidian
```

---

## 17. Memory Tiering

Articles have maturity levels that evolve over time:

### Tiers
| Status | Meaning | Color |
|--------|---------|-------|
| **draft** | New, unreviewed | Gray |
| **review** | Needs verification | Blue |
| **published** | Mature, validated | Green |

### How Articles Progress
- New compiled articles start as **draft**
- Manually promote via the article's status badge (future feature) or by editing the frontmatter
- The Dashboard shows tier distribution in the maturity bar

### Auto-Decay
On every app startup, articles not updated in 60+ days are automatically demoted:
- `published` → `review`
- `review` → `draft`

This prevents stale knowledge from appearing authoritative. To prevent decay, update the article (even a small edit resets the timer).

---

## 18. Multi-Agent Compilation

For more thorough compilation, the app can use a 3-agent pipeline instead of a single LLM call:

### The Pipeline
1. **Summarizer** — Reads the raw source and produces a structured summary (key points, main concepts, notable claims)
2. **Cross-Referencer** — Reads the summary + existing wiki, identifies connections, contradictions, and suggested `[[wiki-links]]`
3. **Writer** — Takes the summary and cross-references, writes the final wiki article with proper formatting

### When to Use
- The standard single-pass compile works well for straightforward sources
- The multi-agent pipeline is better for:
  - Complex, multi-topic sources
  - Sources that heavily overlap with existing wiki content
  - When you want thorough cross-referencing

### Cost
The multi-agent pipeline makes 3 LLM calls per source instead of 1, so it costs ~3x more in API tokens. With Ollama (free, local), this is not a concern.

---

## 19. Tips & Best Practices

### Getting Started
- **Start small** — Pick one topic, add 5-10 sources, compile, explore
- **Quality over quantity** — One well-compiled article is worth more than ten shallow ones
- **Let it compound** — Every Q&A session should produce artifacts filed back to the wiki

### Organizing Your Wiki
- **Use categories consistently** — Pick 3-5 broad categories and stick to them
- **Cross-reference heavily** — The more `[[wiki-links]]`, the richer the graph
- **Review orphans** — Check the Dashboard for orphan articles and add links

### LLM Tips
- **Ollama for experimentation** — Free, fast, no rate limits. Use `gemma3:4b` or `llama3` for quick compiles
- **Cloud LLMs for quality** — Claude and GPT-4o produce better-structured articles for complex sources
- **Customize CLAUDE.md** — Tune the compilation style for your domain (academic, casual, technical)

### Workflow Ideas
- **Research project** — Add papers and articles over weeks, build a comprehensive wiki with an evolving thesis
- **Book companion** — File each chapter, build character/theme/plot pages as you read
- **Learning journal** — Ingest course notes, videos, articles. The wiki becomes your study guide
- **Competitive analysis** — Track competitors with regular source updates, the wiki maintains the picture

### Maintenance
- **Lint regularly** — Use Claude Code in the terminal: "lint the wiki"
- **Check the graph** — Orphans and disconnected clusters need attention
- **Review stale articles** — The Dashboard flags articles not updated in 30+ days

---

## 20. Troubleshooting

### Port 1420 already in use
A previous instance didn't shut down cleanly.
```bash
# macOS/Linux
lsof -ti:1420 | xargs kill -9

# Windows
netstat -ano | findstr :1420
taskkill /PID <PID> /F
```

### "command ingest_file missing required key path"
The web file picker doesn't work in Tauri 2.0. Use the native file dialog (File tab in Add Source) instead of drag-and-drop.

### Compilation produces no articles
- Check your API key in Settings
- Test connection: Settings → verify the provider works
- Check the model name matches your provider (e.g., `gemma3:4b` for Ollama, not `gemma-3-4b`)
- For Ollama: make sure the model is pulled (`ollama pull gemma3:4b`)

### App window is blank
- Check the terminal where `pnpm tauri dev` is running for error messages
- Try `pnpm build` to see if there are TypeScript errors
- Clear the Vite cache: `rm -rf app/node_modules/.vite`

### Rust compilation errors
- Ensure Rust is up to date: `rustup update stable`
- Clean and rebuild: `cd app/src-tauri && cargo clean && cargo check`

### Ollama not connecting
- Make sure Ollama is running: `ollama serve`
- Check the endpoint in Settings (default: `http://localhost:11434`)
- Verify the model is available: `ollama list`

### Dark mode looks wrong
- Toggle the theme using the sun/moon icon in the sidebar footer
- If colors are off, the app follows your system preference by default — check your OS dark mode setting

### Search returns no results
- Search only indexes `wiki/` articles, not `raw/` sources
- Compile your sources first, then search
- The search uses BM25 keyword matching — try simpler terms
