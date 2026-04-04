#!/usr/bin/env python3
"""
search.py — Full-text search over the wiki.

Usage:
  python tools/search.py "query terms"
  python tools/search.py "query" --top 10
  python tools/search.py "query" --raw         # Also search raw/ directory
  python tools/search.py --list                 # List all articles

No external dependencies — uses built-in TF-IDF ranking.
"""

import argparse
import math
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI_DIR = ROOT / "wiki"
RAW_DIR = ROOT / "raw"


def load_documents(include_raw: bool = False) -> dict[str, str]:
    """Load all markdown files and return {path: content}."""
    docs = {}

    for md_file in WIKI_DIR.rglob("*.md"):
        rel = str(md_file.relative_to(ROOT))
        docs[rel] = md_file.read_text(encoding="utf-8", errors="replace")

    if include_raw:
        for md_file in RAW_DIR.rglob("*.md"):
            rel = str(md_file.relative_to(ROOT))
            docs[rel] = md_file.read_text(encoding="utf-8", errors="replace")

    return docs


def tokenize(text: str) -> list[str]:
    """Simple tokenizer."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return [w for w in text.split() if len(w) > 1]


def extract_title(content: str) -> str:
    """Extract title from frontmatter or first heading."""
    # Try frontmatter
    match = re.search(r'^title:\s*"?(.+?)"?\s*$', content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    # Try first heading
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return "(untitled)"


def extract_summary(content: str, query_tokens: set) -> str:
    """Extract a relevant snippet containing query terms."""
    lines = content.split("\n")
    best_line = ""
    best_score = 0

    for line in lines:
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("---") or line_clean.startswith("#"):
            continue
        tokens = set(tokenize(line_clean))
        score = len(tokens & query_tokens)
        if score > best_score:
            best_score = score
            best_line = line_clean

    if best_line:
        return best_line[:200] + ("…" if len(best_line) > 200 else "")
    # Fallback: first non-empty line after frontmatter
    in_frontmatter = False
    for line in lines:
        if line.strip() == "---":
            in_frontmatter = not in_frontmatter
            continue
        if not in_frontmatter and line.strip() and not line.startswith("#"):
            return line.strip()[:200]
    return ""


def search(query: str, docs: dict[str, str], top_k: int = 5) -> list[dict]:
    """TF-IDF search over documents."""
    query_tokens = tokenize(query)
    if not query_tokens:
        return []

    # Build document frequency
    doc_tokens = {}
    df = Counter()
    for path, content in docs.items():
        tokens = tokenize(content)
        doc_tokens[path] = tokens
        unique = set(tokens)
        for t in unique:
            df[t] += 1

    n_docs = len(docs)
    results = []

    for path, tokens in doc_tokens.items():
        if not tokens:
            continue
        tf = Counter(tokens)
        score = 0.0
        for qt in query_tokens:
            if qt in tf:
                tf_val = tf[qt] / len(tokens)
                idf_val = math.log((n_docs + 1) / (df.get(qt, 0) + 1))
                score += tf_val * idf_val

        # Boost exact phrase matches
        content_lower = docs[path].lower()
        if query.lower() in content_lower:
            score *= 2.0

        # Boost title matches
        title = extract_title(docs[path]).lower()
        for qt in query_tokens:
            if qt in title:
                score *= 1.5

        if score > 0:
            results.append({
                "path": path,
                "score": score,
                "title": extract_title(docs[path]),
                "summary": extract_summary(docs[path], set(query_tokens)),
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def list_articles():
    """List all wiki articles."""
    docs = load_documents(include_raw=False)
    if not docs:
        print("No wiki articles found. Compile some raw sources first.")
        return

    print(f"\n📚 Wiki Articles ({len(docs)} total)\n")
    for path in sorted(docs.keys()):
        title = extract_title(docs[path])
        word_count = len(docs[path].split())
        print(f"  {path:<45} {title:<40} ~{word_count} words")


def main():
    parser = argparse.ArgumentParser(description="Search the knowledge base")
    parser.add_argument("query", nargs="?", help="Search query")
    parser.add_argument("--top", type=int, default=5, help="Number of results")
    parser.add_argument("--raw", action="store_true", help="Also search raw/ directory")
    parser.add_argument("--list", action="store_true", help="List all articles")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    if args.list:
        list_articles()
        return

    if not args.query:
        parser.print_help()
        return

    docs = load_documents(include_raw=args.raw)
    if not docs:
        print("No documents found. Add sources to raw/ and compile first.")
        return

    results = search(args.query, docs, top_k=args.top)

    if args.json:
        import json
        print(json.dumps(results, indent=2))
        return

    if not results:
        scope = "wiki + raw" if args.raw else "wiki"
        print(f'\nNo results for "{args.query}" in {scope}/.')
        return

    print(f'\n🔍 Results for "{args.query}" ({len(results)} found)\n')
    for i, r in enumerate(results, 1):
        score_bar = "█" * min(int(r["score"] * 20), 20)
        print(f"  {i}. {r['title']}")
        print(f"     {r['path']}")
        print(f"     {score_bar} ({r['score']:.4f})")
        if r["summary"]:
            print(f"     {r['summary']}")
        print()


if __name__ == "__main__":
    main()
