#!/usr/bin/env python3
"""
export.py — Export wiki content to various formats.

Usage:
  python tools/export.py slides <article>    # Generate Marp slideshow from a wiki article
  python tools/export.py report <query>      # Generate a synthesis report on a topic
  python tools/export.py chart <article>     # Generate a chart script from data in an article
  python tools/export.py obsidian            # Validate Obsidian compatibility

Marp slides can be rendered with: npx @marp-team/marp-cli slides.md -o slides.pdf
"""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI_DIR = ROOT / "wiki"
OUTPUT_DIR = ROOT / "outputs"


def ensure_dirs():
    for sub in ["slides", "charts", "reports"]:
        (OUTPUT_DIR / sub).mkdir(parents=True, exist_ok=True)


def find_article(name: str) -> Path | None:
    """Find a wiki article by name or slug."""
    # Exact match
    exact = WIKI_DIR / f"{name}.md"
    if exact.exists():
        return exact

    # Fuzzy match
    name_lower = name.lower().replace(" ", "-")
    for f in WIKI_DIR.glob("*.md"):
        if name_lower in f.stem.lower():
            return f
    return None


# ──────────────────── Marp Slides ────────────────────
def export_slides(article_name: str):
    """Convert a wiki article into a Marp-format slideshow."""
    article = find_article(article_name)
    if not article:
        print(f"Article not found: {article_name}")
        print("Available:", ", ".join(f.stem for f in WIKI_DIR.glob("*.md") if not f.name.startswith("_")))
        sys.exit(1)

    content = article.read_text(encoding="utf-8")

    # Extract title and sections
    title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    title = title_match.group(1) if title_match else article.stem.replace("-", " ").title()

    # Split by h2 sections
    sections = re.split(r"^##\s+", content, flags=re.MULTILINE)

    # Build Marp presentation
    slides = [
        "---",
        "marp: true",
        "theme: default",
        "paginate: true",
        f"header: '{title}'",
        f"footer: 'Knowledge GPT | {datetime.now().strftime(\"%Y-%m-%d\")}'",
        "---",
        "",
        f"# {title}",
        "",
        f"*Generated from wiki/{article.name}*",
        "",
    ]

    for section in sections[1:]:  # Skip pre-header content
        lines = section.strip().split("\n")
        heading = lines[0].strip()
        body = "\n".join(lines[1:]).strip()

        # Skip metadata sections
        if heading.lower() in ("sources", "open questions", "relationships"):
            continue

        slides.append("---")
        slides.append("")
        slides.append(f"## {heading}")
        slides.append("")

        # Split long sections into multiple slides
        paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
        for i, para in enumerate(paragraphs):
            if i > 0 and len(para) > 300:
                slides.append("---")
                slides.append("")
                slides.append(f"## {heading} (cont.)")
                slides.append("")
            slides.append(para)
            slides.append("")

    # Save
    slug = article.stem
    dest = OUTPUT_DIR / "slides" / f"{slug}-slides.md"
    dest.write_text("\n".join(slides), encoding="utf-8")
    print(f"✓ Slides saved: {dest.relative_to(ROOT)}")
    print(f"  Render with: npx @marp-team/marp-cli {dest} -o {dest.with_suffix('.pdf')}")


# ──────────────────── Chart Script ────────────────────
def export_chart(article_name: str):
    """Generate a matplotlib chart script from data in an article."""
    article = find_article(article_name)
    if not article:
        print(f"Article not found: {article_name}")
        sys.exit(1)

    content = article.read_text(encoding="utf-8")
    title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    title = title_match.group(1) if title_match else article.stem

    # Extract tables (simple markdown tables)
    tables = re.findall(r"(\|.+\|(?:\n\|.+\|)+)", content)

    slug = article.stem
    dest = OUTPUT_DIR / "charts" / f"{slug}-chart.py"

    script = f'''#!/usr/bin/env python3
"""
Auto-generated chart script for: {title}
Source: wiki/{article.name}

Run: python {dest.relative_to(ROOT)}
"""

import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams["font.family"] = "sans-serif"
matplotlib.rcParams["figure.figsize"] = (12, 7)
matplotlib.rcParams["figure.dpi"] = 150

# TODO: Extract data from the article and populate these
# The article contains {len(tables)} table(s) that could be visualized.

# Example template:
labels = ["Category A", "Category B", "Category C", "Category D"]
values = [25, 40, 30, 35]

fig, ax = plt.subplots()
bars = ax.bar(labels, values, color=["#e85d26", "#2d5a87", "#4a9e6e", "#8b6cc7"])
ax.set_title("{title}", fontsize=16, fontweight="bold", pad=15)
ax.set_ylabel("Value")
ax.spines[["top", "right"]].set_visible(False)

for bar, val in zip(bars, values):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
            str(val), ha="center", va="bottom", fontsize=11)

plt.tight_layout()
plt.savefig("{ROOT / "outputs" / "charts" / f"{slug}-chart.png"}")
plt.show()
print("Chart saved to outputs/charts/{slug}-chart.png")
'''

    dest.write_text(script, encoding="utf-8")
    print(f"✓ Chart script saved: {dest.relative_to(ROOT)}")
    print(f"  Run: python {dest.relative_to(ROOT)}")


# ──────────────────── Obsidian Validation ────────────────────
def validate_obsidian():
    """Check wiki for Obsidian compatibility issues."""
    issues = []

    for md_file in WIKI_DIR.glob("*.md"):
        content = md_file.read_text(encoding="utf-8", errors="replace")
        name = md_file.name

        # Check for broken wikilinks
        links = re.findall(r"\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]", content)
        for link in links:
            slug = link.lower().replace(" ", "-")
            target = WIKI_DIR / f"{slug}.md"
            if not target.exists():
                # Try case-insensitive
                found = False
                for f in WIKI_DIR.glob("*.md"):
                    if f.stem.lower() == slug:
                        found = True
                        break
                if not found:
                    issues.append(f"  {name}: broken link [[{link}]]")

        # Check for invalid frontmatter
        if content.startswith("---"):
            end = content.find("---", 3)
            if end == -1:
                issues.append(f"  {name}: unclosed frontmatter")

    if issues:
        print(f"⚠️  Found {len(issues)} Obsidian compatibility issues:\n")
        for issue in issues:
            print(issue)
    else:
        print("✓ Wiki is fully Obsidian-compatible!")

    # Check .obsidian config suggestion
    obsidian_dir = ROOT / ".obsidian"
    if not obsidian_dir.exists():
        print(f"\n💡 Tip: Open this folder in Obsidian to use it as a vault.")
        print(f"   The root folder is: {ROOT}")


def main():
    parser = argparse.ArgumentParser(description="Export wiki content")
    sub = parser.add_subparsers(dest="command")

    slides_p = sub.add_parser("slides", help="Generate Marp slides")
    slides_p.add_argument("article", help="Wiki article name/slug")

    chart_p = sub.add_parser("chart", help="Generate chart script")
    chart_p.add_argument("article", help="Wiki article name/slug")

    sub.add_parser("obsidian", help="Validate Obsidian compatibility")

    args = parser.parse_args()
    ensure_dirs()

    if args.command == "slides":
        export_slides(args.article)
    elif args.command == "chart":
        export_chart(args.article)
    elif args.command == "obsidian":
        validate_obsidian()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
