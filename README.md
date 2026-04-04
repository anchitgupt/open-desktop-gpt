# 🧠 Knowledge GPT

A personal knowledge base system where **the LLM writes the wiki, and you read it**. Inspired by [Andrej Karpathy's LLM Knowledge Bases workflow](https://x.com/karpathy/status/2039805659525644595).

No RAG. No vector DB. No embeddings. Just structured markdown, an LLM compiler, and Obsidian.

## How It Works

```
raw/ sources ──→ LLM "compiles" ──→ wiki/ (structured .md)
                                         ↑
                    Q&A, linting, ←───────┘
                    explorations
                    get filed back
```

1. **You** drop raw sources into `raw/` — articles, papers, repos, datasets, images
2. **Claude Code** reads them and "compiles" a structured, interlinked wiki
3. **You** ask questions; the LLM synthesizes answers from the wiki
4. **Answers and explorations** get filed back into the wiki — it compounds over time
5. **Obsidian** is the frontend — you browse, search, and visualize the wiki

## Quick Start

```bash
# 1. Clone / copy this project
cd knowledge-gpt

# 2. Install tools (optional, for URL ingestion)
pip install -r requirements.txt

# 3. Add your first source
python tools/ingest.py url "https://some-article-url.com"
# or just drop a .md / .pdf file into raw/articles/

# 4. Open in Claude Code
claude

# 5. Tell Claude to compile
> Compile the new raw sources into the wiki

# 6. Open in Obsidian
# File → Open Vault → Select this folder
```

## Usage with Claude Code

### Compiling Sources
```
> I just added 3 new papers to raw/papers/. Compile them into the wiki.
> File this article to our wiki: [paste URL or content]
> Recompile the entire wiki from scratch
```

### Asking Questions
```
> What are the key differences between LoRA and QLoRA?
> Summarize everything we know about attention mechanisms
> What are the open questions in our knowledge base?
```

### Linting & Health Checks
```
> Lint the wiki
> Find orphan articles with no backlinks
> Check for inconsistencies across articles
> Suggest new articles we should write
```

### Generating Outputs
```
> Generate a slideshow from the transformers article
> Create a chart comparing model sizes
> Write a synthesis report on training techniques
```

### Reindexing
```
> Reindex the wiki
> Update the concept map
> Rebuild the category taxonomy
```

## CLI Tools

| Tool | Description |
|------|-------------|
| `tools/ingest.py url <URL>` | Fetch a web page, convert to markdown, save to `raw/` |
| `tools/ingest.py file <path>` | Copy a local file into `raw/` |
| `tools/ingest.py clip` | Ingest from clipboard (`pbpaste \| python tools/ingest.py clip`) |
| `tools/ingest.py youtube <URL>` | Save YouTube video reference |
| `tools/search.py "query"` | Full-text TF-IDF search over wiki |
| `tools/search.py --list` | List all wiki articles |
| `tools/stats.py` | Wiki statistics and health overview |
| `tools/stats.py --backlinks` | Show the backlink graph |
| `tools/export.py slides <article>` | Generate Marp-format slideshow |
| `tools/export.py chart <article>` | Generate matplotlib chart script |
| `tools/export.py obsidian` | Validate Obsidian compatibility |

## Project Structure

```
knowledge-gpt/
├── CLAUDE.md              # Instructions for Claude Code (the "brain")
├── raw/                   # Raw sources (you add these)
│   ├── articles/          # Web articles, blog posts
│   ├── papers/            # Research papers
│   ├── repos/             # Code repo notes
│   ├── datasets/          # Dataset descriptions
│   └── images/            # Reference images
├── wiki/                  # Compiled wiki (Claude maintains this)
│   ├── _index.md          # Master index
│   ├── _concepts.md       # A–Z concept map
│   ├── _categories.md     # Category taxonomy
│   ├── _recent.md         # Recently updated
│   └── *.md               # Individual articles
├── outputs/               # Generated artifacts
│   ├── slides/            # Marp presentations
│   ├── charts/            # Matplotlib visualizations
│   └── reports/           # Synthesis reports
├── tools/                 # CLI helper scripts
├── .knowledge-gpt/        # Config and state
│   ├── config.yaml        # Settings
│   └── compile_log.jsonl  # Activity log
└── requirements.txt
```

## Why Not RAG?

Karpathy's key insight: at the scale of a personal knowledge base (~100 articles, ~400K words), a well-structured markdown wiki with indexes and summaries is **more effective** than chunking + embeddings + vector search:

- **Human-readable**: Every claim traces to a `.md` file you can read
- **Self-healing**: LLM linting finds and fixes issues
- **Compounding**: Q&A outputs feed back into the wiki
- **Zero infrastructure**: No database, no server, just files
- **Obsidian-native**: Full backlink graph, search, visualization

## Tips

- **Start small**: Pick one research topic, add 10–20 sources, compile, iterate
- **Let it compound**: Every Q&A session should produce artifacts that go back into the wiki
- **Lint regularly**: Run health checks weekly to keep the wiki coherent
- **Use Obsidian Graph View**: The backlink graph reveals emergent connections
- **Customize CLAUDE.md**: Tune the compilation style, categories, and rules for your domain
