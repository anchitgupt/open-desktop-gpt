#!/usr/bin/env python3
"""
ingest.py — Ingest sources into raw/ directory.

Usage:
  python tools/ingest.py url <URL>              # Fetch and convert a web page to markdown
  python tools/ingest.py file <path>            # Copy a file into raw/
  python tools/ingest.py clip                   # Read from clipboard (pipe from pbpaste/xclip)
  python tools/ingest.py youtube <URL>          # Extract transcript from YouTube video

Requires: requests, beautifulsoup4, markdownify
Optional: yt-dlp (for YouTube transcripts)
"""

import argparse
import hashlib
import json
import os
import re
import sys
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# Project root
ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "raw"
LOG_FILE = ROOT / ".knowledge-gpt" / "compile_log.jsonl"


def ensure_dirs():
    for sub in ["articles", "papers", "repos", "datasets", "images"]:
        (RAW_DIR / sub).mkdir(parents=True, exist_ok=True)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


def log_action(action: str, details: dict):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        **details,
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text[:80].strip("-")


# ──────────────────── URL Ingestion ────────────────────
def ingest_url(url: str):
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        print("Install dependencies: pip install requests beautifulsoup4 markdownify")
        sys.exit(1)

    print(f"Fetching: {url}")
    headers = {"User-Agent": "Mozilla/5.0 (KnowledgeGPT/1.0)"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # Extract title
    title = ""
    if soup.title:
        title = soup.title.string or ""
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else urlparse(url).netloc

    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
        tag.decompose()

    # Try to get article content
    article = soup.find("article") or soup.find("main") or soup.find("body")

    try:
        from markdownify import markdownify as md
        content = md(str(article), heading_style="ATX", strip=["img"])
    except ImportError:
        content = article.get_text(separator="\n\n", strip=True)

    # Download images
    images_downloaded = []
    for img in (article or soup).find_all("img", src=True):
        src = img["src"]
        if src.startswith("data:"):
            continue
        if not src.startswith("http"):
            from urllib.parse import urljoin
            src = urljoin(url, src)
        try:
            img_resp = requests.get(src, headers=headers, timeout=15)
            if img_resp.status_code == 200:
                ext = Path(urlparse(src).path).suffix or ".png"
                img_name = slugify(title)[:40] + f"_{len(images_downloaded)}{ext}"
                img_path = RAW_DIR / "images" / img_name
                img_path.write_bytes(img_resp.content)
                images_downloaded.append(img_name)
        except Exception:
            pass

    # Build frontmatter
    slug = slugify(title)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    domain = urlparse(url).netloc

    frontmatter = f"""---
title: "{title}"
source_url: "{url}"
source_domain: "{domain}"
ingested: {now}
type: article
images: {json.dumps(images_downloaded)}
---

"""

    # Save
    dest = RAW_DIR / "articles" / f"{slug}.md"
    counter = 1
    while dest.exists():
        dest = RAW_DIR / "articles" / f"{slug}-{counter}.md"
        counter += 1

    dest.write_text(frontmatter + content, encoding="utf-8")
    print(f"✓ Saved: {dest.relative_to(ROOT)}")
    print(f"  Title: {title}")
    print(f"  Images: {len(images_downloaded)}")

    log_action("ingest_url", {"url": url, "dest": str(dest.relative_to(ROOT)), "title": title})
    return dest


# ──────────────────── File Ingestion ────────────────────
def ingest_file(path: str):
    src = Path(path).resolve()
    if not src.exists():
        print(f"Error: File not found: {path}")
        sys.exit(1)

    ext = src.suffix.lower()
    category_map = {
        ".pdf": "papers",
        ".md": "articles",
        ".markdown": "articles",
        ".txt": "articles",
        ".csv": "datasets",
        ".json": "datasets",
        ".jsonl": "datasets",
        ".png": "images",
        ".jpg": "images",
        ".jpeg": "images",
        ".gif": "images",
        ".svg": "images",
        ".webp": "images",
    }
    category = category_map.get(ext, "articles")

    dest = RAW_DIR / category / src.name
    counter = 1
    while dest.exists():
        dest = RAW_DIR / category / f"{src.stem}-{counter}{src.suffix}"
        counter += 1

    shutil.copy2(src, dest)
    print(f"✓ Copied: {dest.relative_to(ROOT)}")

    log_action("ingest_file", {"source": str(src), "dest": str(dest.relative_to(ROOT))})
    return dest


# ──────────────────── Clipboard Ingestion ────────────────────
def ingest_clipboard():
    content = sys.stdin.read()
    if not content.strip():
        print("Error: No content from stdin. Usage: pbpaste | python tools/ingest.py clip")
        sys.exit(1)

    # Try to detect if it's a URL
    if content.strip().startswith("http") and "\n" not in content.strip():
        return ingest_url(content.strip())

    # Save as raw markdown
    slug = slugify(content[:60])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    dest = RAW_DIR / "articles" / f"clip-{slug}-{now}.md"

    frontmatter = f"""---
title: "Clipboard: {content[:50]}..."
ingested: {now}
type: clipboard
---

"""
    dest.write_text(frontmatter + content, encoding="utf-8")
    print(f"✓ Saved clipboard: {dest.relative_to(ROOT)}")

    log_action("ingest_clipboard", {"dest": str(dest.relative_to(ROOT))})
    return dest


# ──────────────────── YouTube Ingestion ────────────────────
def ingest_youtube(url: str):
    try:
        import subprocess
        result = subprocess.run(
            ["yt-dlp", "--write-auto-sub", "--sub-lang", "en", "--skip-download",
             "--write-subs", "--sub-format", "vtt", "--print", "title", url],
            capture_output=True, text=True, timeout=60
        )
        title = result.stdout.strip().split("\n")[0] or "youtube-video"
    except FileNotFoundError:
        print("yt-dlp not found. Install: pip install yt-dlp")
        sys.exit(1)

    slug = slugify(title)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Try to get transcript via yt-dlp subtitle extraction
    # Simplified: save metadata as a raw source
    content = f"""---
title: "{title}"
source_url: "{url}"
ingested: {now}
type: youtube
---

# {title}

Source: {url}

> Note: Use an LLM to watch/transcribe this video and compile notes into the wiki.
"""

    dest = RAW_DIR / "articles" / f"{slug}.md"
    dest.write_text(content, encoding="utf-8")
    print(f"✓ Saved YouTube ref: {dest.relative_to(ROOT)}")

    log_action("ingest_youtube", {"url": url, "dest": str(dest.relative_to(ROOT)), "title": title})
    return dest


# ──────────────────── Main ────────────────────
def main():
    parser = argparse.ArgumentParser(description="Ingest sources into the knowledge base")
    sub = parser.add_subparsers(dest="command")

    url_parser = sub.add_parser("url", help="Ingest a web URL")
    url_parser.add_argument("url", help="URL to fetch")

    file_parser = sub.add_parser("file", help="Ingest a local file")
    file_parser.add_argument("path", help="Path to file")

    sub.add_parser("clip", help="Ingest from clipboard/stdin")

    yt_parser = sub.add_parser("youtube", help="Ingest YouTube video")
    yt_parser.add_argument("url", help="YouTube URL")

    args = parser.parse_args()
    ensure_dirs()

    if args.command == "url":
        ingest_url(args.url)
    elif args.command == "file":
        ingest_file(args.path)
    elif args.command == "clip":
        ingest_clipboard()
    elif args.command == "youtube":
        ingest_youtube(args.url)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
