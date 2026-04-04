# Open Desktop GPT — LLM Instructions

> These instructions tell your LLM (Claude Code, ChatGPT, etc.) how to operate this knowledge base. They are read automatically by Claude Code when you open this project.

The LLM acts as the **compiler, librarian, and research assistant** for this knowledge base. Its job is to maintain a structured, interlinked markdown wiki from raw source materials.

## Architecture

```
open-desktop-gpt/
├── raw/                    # Raw source documents (user adds these)
│   ├── articles/           # Web articles (markdown)
│   ├── papers/             # Research papers (PDF/md)
│   ├── repos/              # Code repos (README + notes)
│   ├── datasets/           # Dataset descriptions
│   └── images/             # Reference images
├── wiki/                   # Compiled wiki (LLM maintains this)
│   ├── _index.md           # Master index of all articles
│   ├── _concepts.md        # Concept map with brief definitions
│   ├── _categories.md      # Category taxonomy
│   ├── _recent.md          # Recently updated articles
│   └── <topic-slug>.md     # Individual wiki articles
├── outputs/                # Generated artifacts
│   ├── slides/             # Marp-format slideshows
│   ├── charts/             # Generated visualizations
│   └── reports/            # Synthesized reports
├── tools/                  # CLI helper scripts
│   ├── ingest.py           # Convert URLs/files to raw/
│   ├── search.py           # Full-text search over wiki
│   ├── stats.py            # Wiki statistics
│   └── export.py           # Export to various formats
├── .knowledge-gpt/
│   ├── config.yaml         # Configuration
│   └── compile_log.jsonl   # Log of all compilation actions
└── CLAUDE.md               # This file
```

## Core Workflows

### 1. COMPILE: `raw/ → wiki/`

When the user says **"compile"**, **"file this"**, **"add to wiki"**, or drops new files in `raw/`:

1. **Read** the raw source document(s) carefully
2. **Decide** where it fits in the existing wiki:
   - Does it extend an existing article? → Update that article
   - Is it a new concept? → Create a new article
   - Does it span multiple topics? → Update multiple articles + create cross-links
3. **Write/update** wiki articles following the Wiki Article Format below
4. **Update** `_index.md`, `_concepts.md`, and `_categories.md`
5. **Create backlinks** from related articles to the new content
6. **Log** the action to `.knowledge-gpt/compile_log.jsonl`

**Compilation style:**
- Write in an encyclopedic, neutral tone
- Synthesize — don't just copy. Combine insights from multiple sources
- Always cite which raw source(s) informed each section: `[Source: raw/articles/filename.md]`
- Prefer depth over breadth. One excellent article > five shallow ones
- When sources disagree, present both perspectives

### 2. Q&A: Research answers from the wiki

When the user asks a **question**:

1. **Read** `_index.md` to understand the wiki's scope
2. **Read** relevant articles based on the question
3. **Synthesize** an answer grounded in wiki content
4. **Cite** specific wiki articles: `[See: wiki/article-name.md]`
5. If the wiki doesn't have enough info, say so clearly and suggest what raw sources could fill the gap
6. **Optionally**, generate the answer as a new `.md` file, slideshow, or chart and file it back into the wiki

### 3. LINT: Health checks

When the user says **"lint"**, **"health check"**, or **"review"**:

Run these checks and report findings:

- **Orphan detection**: Wiki articles with no backlinks
- **Stale content**: Articles not updated in a long time
- **Missing links**: Concepts mentioned but not linked
- **Inconsistencies**: Contradictory claims across articles
- **Gaps**: Topics referenced in raw/ but missing from wiki/
- **Quality**: Articles that are too short, lack sources, or need restructuring
- **Suggestions**: Propose new articles based on patterns in existing content

Output a structured report. Optionally auto-fix simple issues.

### 4. INDEX: Maintain summaries and navigation

When the user says **"reindex"** or after major compilations:

- Regenerate `_index.md` with a one-line summary per article
- Update `_concepts.md` with a concept → definition map
- Rebuild `_categories.md` taxonomy
- Update `_recent.md` with the last 20 modified articles
- Ensure all backlinks are bidirectional

### 5. SEARCH: Find information

Use `tools/search.py` for full-text search, or read index files to navigate.

### 6. EXPORT: Generate outputs

When the user asks for **slides**, **charts**, **reports**, or **summaries**:

- **Slides**: Generate Marp-format `.md` in `outputs/slides/`
- **Charts**: Generate Python matplotlib scripts in `outputs/charts/`
- **Reports**: Generate synthesis documents in `outputs/reports/`
- **File back**: If the output adds knowledge, file it back into the wiki

---

## Wiki Article Format

Every wiki article in `wiki/` must follow this structure:

```markdown
---
title: "Article Title"
aliases: ["alt-name-1", "alt-name-2"]
categories: ["category1", "category2"]
sources:
  - raw/articles/source-file.md
  - raw/papers/paper-name.md
created: YYYY-MM-DD
updated: YYYY-MM-DD
status: draft | review | published
---

# Article Title

> One-paragraph summary of this topic.

## Overview

Main explanation of the concept/topic.

## Key Points

Detailed breakdown of important aspects.

## Relationships

- **Related to**: [[other-article]], [[another-article]]
- **Part of**: [[parent-concept]]
- **See also**: [[tangent-topic]]

## Sources

- [Source: raw/articles/filename.md] — what this source contributed
- [Source: raw/papers/paper.md] — what this source contributed

## Open Questions

- Things not yet understood or requiring more sources
```

**Obsidian compatibility**: Use `[[wiki-links]]` for internal links. Use standard markdown for everything else. Keep images in `raw/images/` and reference them with relative paths.

---

## Meta-Index Files

### `_index.md`
```markdown
# Knowledge Base Index

> Last updated: YYYY-MM-DD | Articles: N | Words: ~N

## Articles

| Article | Category | Status | Summary |
|---------|----------|--------|---------|
| [[article-slug]] | cat | published | One-line summary |
```

### `_concepts.md`
```markdown
# Concept Map

## A
- **Attention Mechanism**: The core building block of transformers... [[attention-mechanisms]]
```

### `_categories.md`
```markdown
# Categories

## Architecture
- [[transformers]]
- [[attention-mechanisms]]

## Training
- [[rlhf]]
- [[rlvr]]
```

---

## Rules

1. **The LLM writes the wiki. The human reads it.** Rarely should the human edit wiki/ directly.
2. **Incremental compilation.** Process new raw docs one at a time. Don't rewrite the whole wiki.
3. **Backlinks are sacred.** Every concept mention should be a `[[link]]`.
4. **Source attribution is mandatory.** Every claim traces back to a raw/ source.
5. **The wiki compounds.** Q&A outputs and explorations get filed back.
6. **Markdown is the lingua franca.** Everything is `.md` — human-readable, LLM-friendly, Obsidian-native.
7. **Be opinionated about structure.** If the wiki needs reorganizing, propose it.

---

## Configuration

See `.knowledge-gpt/config.yaml` for:
- Wiki topic/scope
- Preferred categories
- Compilation style (academic / casual / technical)
- Auto-lint frequency
- Export preferences
