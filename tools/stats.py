#!/usr/bin/env python3
"""
stats.py — Wiki statistics and health overview.

Usage:
  python tools/stats.py              # Full stats
  python tools/stats.py --brief      # One-line summary
  python tools/stats.py --backlinks  # Show backlink graph
"""

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI_DIR = ROOT / "wiki"
RAW_DIR = ROOT / "raw"


def count_files(directory: Path, pattern: str = "**/*") -> tuple[int, int]:
    """Count files and total bytes."""
    files = list(directory.rglob(pattern))
    total = sum(f.stat().st_size for f in files if f.is_file())
    return len([f for f in files if f.is_file()]), total


def extract_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter as a simple dict."""
    match = re.match(r"^---\n(.+?)\n---", content, re.DOTALL)
    if not match:
        return {}
    fm = {}
    for line in match.group(1).split("\n"):
        if ":" in line:
            key, _, val = line.partition(":")
            fm[key.strip()] = val.strip().strip('"').strip("'")
    return fm


def find_wikilinks(content: str) -> list[str]:
    """Find all [[wiki-links]] in content."""
    return re.findall(r"\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]", content)


def analyze_wiki():
    """Analyze the wiki directory."""
    articles = list(WIKI_DIR.glob("*.md"))
    meta_files = {"_index.md", "_concepts.md", "_categories.md", "_recent.md"}

    wiki_articles = [a for a in articles if a.name not in meta_files]
    total_words = 0
    categories = Counter()
    statuses = Counter()
    backlinks = defaultdict(set)
    all_links = defaultdict(set)
    orphans = []

    for article in wiki_articles:
        content = article.read_text(encoding="utf-8", errors="replace")
        words = len(content.split())
        total_words += words

        fm = extract_frontmatter(content)
        if fm.get("status"):
            statuses[fm["status"]] += 1
        if fm.get("categories"):
            for cat in re.findall(r'"([^"]+)"', fm["categories"]):
                categories[cat] += 1

        # Backlinks
        slug = article.stem
        links = find_wikilinks(content)
        for link in links:
            link_slug = link.lower().replace(" ", "-")
            all_links[slug].add(link_slug)
            backlinks[link_slug].add(slug)

    # Find orphans
    for article in wiki_articles:
        slug = article.stem
        if slug not in backlinks or len(backlinks[slug]) == 0:
            orphans.append(slug)

    return {
        "articles": wiki_articles,
        "total_words": total_words,
        "categories": categories,
        "statuses": statuses,
        "backlinks": backlinks,
        "all_links": all_links,
        "orphans": orphans,
    }


def format_bytes(b: int) -> str:
    if b < 1024:
        return f"{b} B"
    if b < 1048576:
        return f"{b / 1024:.1f} KB"
    return f"{b / 1048576:.1f} MB"


def print_stats(brief: bool = False):
    """Print wiki statistics."""
    # Raw counts
    raw_articles, _ = count_files(RAW_DIR / "articles", "*.md")
    raw_papers, _ = count_files(RAW_DIR / "papers")
    raw_images, _ = count_files(RAW_DIR / "images")
    raw_datasets, _ = count_files(RAW_DIR / "datasets")
    raw_total = raw_articles + raw_papers + raw_images + raw_datasets

    # Wiki analysis
    wiki_data = analyze_wiki()
    n_articles = len(wiki_data["articles"])
    total_words = wiki_data["total_words"]

    if brief:
        print(f"📚 {n_articles} wiki articles | ~{total_words:,} words | {raw_total} raw sources")
        return

    print("╔══════════════════════════════════════════════════════╗")
    print("║           📚  KNOWLEDGE BASE STATISTICS             ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()

    # Raw sources
    print("  RAW SOURCES")
    print(f"    Articles:  {raw_articles}")
    print(f"    Papers:    {raw_papers}")
    print(f"    Images:    {raw_images}")
    print(f"    Datasets:  {raw_datasets}")
    print(f"    Total:     {raw_total}")
    print()

    # Wiki
    print("  WIKI")
    print(f"    Articles:  {n_articles}")
    print(f"    Words:     ~{total_words:,}")
    print(f"    Avg words: ~{total_words // max(n_articles, 1):,} per article")
    print()

    # Status breakdown
    if wiki_data["statuses"]:
        print("  STATUS")
        for status, count in wiki_data["statuses"].most_common():
            bar = "█" * count
            print(f"    {status:<12} {bar} {count}")
        print()

    # Categories
    if wiki_data["categories"]:
        print("  CATEGORIES")
        for cat, count in wiki_data["categories"].most_common(10):
            bar = "█" * count
            print(f"    {cat:<20} {bar} {count}")
        print()

    # Health
    print("  HEALTH")
    orphans = wiki_data["orphans"]
    if orphans:
        print(f"    ⚠️  Orphan articles (no backlinks): {len(orphans)}")
        for o in orphans[:5]:
            print(f"       - {o}")
        if len(orphans) > 5:
            print(f"       ... and {len(orphans) - 5} more")
    else:
        print("    ✓ No orphan articles")

    # Compilation log
    log_file = ROOT / ".knowledge-gpt" / "compile_log.jsonl"
    if log_file.exists():
        lines = log_file.read_text().strip().split("\n")
        actions = Counter()
        for line in lines:
            try:
                entry = json.loads(line)
                actions[entry.get("action", "unknown")] += 1
            except json.JSONDecodeError:
                pass
        print()
        print("  ACTIVITY LOG")
        for action, count in actions.most_common():
            print(f"    {action:<25} {count}")

    print()


def print_backlinks():
    """Print backlink graph."""
    wiki_data = analyze_wiki()
    backlinks = wiki_data["backlinks"]

    print("\n🔗 Backlink Graph\n")
    for target, sources in sorted(backlinks.items(), key=lambda x: -len(x[1])):
        print(f"  {target} ← [{len(sources)} links]")
        for src in sorted(sources):
            print(f"    ← {src}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Wiki statistics")
    parser.add_argument("--brief", action="store_true")
    parser.add_argument("--backlinks", action="store_true")
    args = parser.parse_args()

    if args.backlinks:
        print_backlinks()
    else:
        print_stats(brief=args.brief)


if __name__ == "__main__":
    main()
