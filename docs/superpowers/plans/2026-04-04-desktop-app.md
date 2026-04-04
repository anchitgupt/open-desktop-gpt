# Knowledge GPT Desktop App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri 2.0 desktop app with React frontend for browsing, ingesting, compiling, and querying the Knowledge GPT personal wiki.

**Architecture:** Tauri 2.0 Rust backend handles all file I/O, LLM API calls, and file watching. React frontend (Vite + TypeScript) renders the UI and communicates via Tauri IPC commands and channels. Markdown files in `raw/` and `wiki/` are the sole data store — no database.

**Tech Stack:** Tauri 2.0, React 18+, Vite, TypeScript, TailwindCSS v4, shadcn/ui, pnpm, Rust (reqwest, notify, serde, gray_matter)

**Spec:** `docs/superpowers/specs/2026-04-04-desktop-app-design.md`

---

## Phase 1 — Skeleton: Scaffold, Sidebar, Reader

### Task 1: Scaffold Tauri + React project

**Files:**
- Create: `app/` (entire scaffold)
- Modify: `app/src-tauri/tauri.conf.json`
- Modify: `app/package.json`

- [ ] **Step 1: Create the Tauri app scaffold**

Run from the project root:

```bash
cd /Users/anchitgupta/Documents/Github/knowledge-gpt
pnpm create tauri-app app --template react-ts --manager pnpm
```

When prompted:
- Project name: `app`
- Frontend: TypeScript
- Package manager: pnpm
- Template: React (TypeScript)

- [ ] **Step 2: Install dependencies and verify scaffold runs**

```bash
cd app
pnpm install
pnpm tauri dev
```

Expected: A Tauri window opens showing the default React template. Close it after verifying.

- [ ] **Step 3: Clean up scaffold boilerplate**

Remove default content from `app/src/App.tsx` — replace with a minimal shell:

```tsx
function App() {
  return (
    <div className="flex h-screen">
      <aside className="w-60 border-r p-4">Sidebar</aside>
      <main className="flex-1 p-4">Main</main>
    </div>
  );
}

export default App;
```

Remove `app/src/App.css`. Remove any Tauri-generated demo styles from `app/src/styles.css` (keep the file but clear contents — we'll replace with Tailwind next).

- [ ] **Step 4: Verify the clean scaffold**

```bash
cd app && pnpm tauri dev
```

Expected: Window shows "Sidebar" on the left, "Main" on the right. Close it.

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: scaffold Tauri + React app with minimal shell layout"
```

---

### Task 2: Add TailwindCSS v4 + shadcn/ui

**Files:**
- Modify: `app/vite.config.ts`
- Modify: `app/src/styles.css`
- Modify: `app/tsconfig.json`
- Modify: `app/tsconfig.app.json` (if exists)
- Create: `app/src/lib/utils.ts` (via shadcn init)
- Create: `app/src/components/ui/` (via shadcn init)

- [ ] **Step 1: Install Tailwind CSS v4 with Vite plugin**

```bash
cd app
pnpm add tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add Tailwind plugin to Vite config**

Replace `app/vite.config.ts`:

```ts
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 3: Replace styles.css with Tailwind import**

Replace `app/src/styles.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Configure TypeScript path aliases**

In `app/tsconfig.json`, ensure `compilerOptions` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

If `app/tsconfig.app.json` exists, add the same `baseUrl` and `paths` there too.

- [ ] **Step 5: Initialize shadcn/ui**

```bash
cd app
pnpm dlx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables yes.

- [ ] **Step 6: Add initial shadcn components**

```bash
cd app
pnpm dlx shadcn@latest add button card badge dialog input scroll-area separator tooltip
```

- [ ] **Step 7: Verify Tailwind + shadcn work**

Update `app/src/App.tsx`:

```tsx
import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-60 border-r p-4">
        <h1 className="text-lg font-bold">Knowledge GPT</h1>
      </aside>
      <main className="flex-1 p-4">
        <Button>Test Button</Button>
      </main>
    </div>
  );
}

export default App;
```

```bash
cd app && pnpm tauri dev
```

Expected: Window shows styled sidebar with title and a shadcn button in the main area. Close it.

- [ ] **Step 8: Commit**

```bash
git add app/
git commit -m "feat: add TailwindCSS v4 and shadcn/ui with initial components"
```

---

### Task 3: React Router + page shells

**Files:**
- Create: `app/src/pages/Dashboard.tsx`
- Create: `app/src/pages/Reader.tsx`
- Create: `app/src/pages/QA.tsx`
- Create: `app/src/components/Sidebar.tsx`
- Create: `app/src/components/Layout.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Install React Router**

```bash
cd app
pnpm add react-router-dom
```

- [ ] **Step 2: Create Layout component**

Create `app/src/components/Layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create Sidebar component**

Create `app/src/components/Sidebar.tsx`:

```tsx
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/qa", label: "Q&A" },
  ];

  return (
    <aside className="w-60 border-r flex flex-col">
      <div className="p-4">
        <h1 className="text-lg font-bold">Knowledge GPT</h1>
      </div>
      <Separator />
      <nav className="p-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
              location.pathname === item.to
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
          <span>Uncompiled</span>
          <Badge variant="secondary">0</Badge>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-2">
        <p className="px-3 py-2 text-xs text-muted-foreground">No articles yet</p>
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 4: Create page shells**

Create `app/src/pages/Dashboard.tsx`:

```tsx
export function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <p className="text-muted-foreground">Stats and health checks will appear here.</p>
    </div>
  );
}
```

Create `app/src/pages/Reader.tsx`:

```tsx
import { useParams } from "react-router-dom";

export function Reader() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{slug || "Select an article"}</h2>
      <p className="text-muted-foreground">Article content will render here.</p>
    </div>
  );
}
```

Create `app/src/pages/QA.tsx`:

```tsx
export function QA() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Q&A</h2>
      <p className="text-muted-foreground">Chat interface will appear here.</p>
    </div>
  );
}
```

- [ ] **Step 5: Wire up routing in App.tsx**

Replace `app/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Reader } from "@/pages/Reader";
import { QA } from "@/pages/QA";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wiki/:slug" element={<Reader />} />
          <Route path="/qa" element={<QA />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 6: Verify routing works**

```bash
cd app && pnpm tauri dev
```

Expected: Dashboard page loads by default. Clicking sidebar links navigates between pages. Navigating to `/wiki/test` shows the Reader with slug "test". Close it.

- [ ] **Step 7: Commit**

```bash
git add app/src/
git commit -m "feat: add React Router with Layout, Sidebar, Dashboard, Reader, QA pages"
```

---

### Task 4: Rust backend — wiki read commands

**Files:**
- Create: `app/src-tauri/src/wiki.rs`
- Modify: `app/src-tauri/src/lib.rs`
- Modify: `app/src-tauri/Cargo.toml`

- [ ] **Step 1: Add Rust dependencies**

Add to `app/src-tauri/Cargo.toml` under `[dependencies]`:

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
gray_matter = "0.2"
walkdir = "2"
open = "5"
```

Note: `serde` and `serde_json` may already be present from the scaffold — if so, just ensure the versions match.

- [ ] **Step 2: Create wiki module**

Create `app/src-tauri/src/wiki.rs`:

```rust
use gray_matter::Matter;
use gray_matter::engine::YAML;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArticleMeta {
    pub slug: String,
    pub title: String,
    pub categories: Vec<String>,
    pub status: String,
    pub word_count: usize,
    pub updated: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Article {
    pub slug: String,
    pub title: String,
    pub categories: Vec<String>,
    pub status: String,
    pub updated: String,
    pub sources: Vec<String>,
    pub body: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WikiStats {
    pub article_count: usize,
    pub total_words: usize,
    pub categories: Vec<CategoryCount>,
    pub orphans: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryCount {
    pub name: String,
    pub count: usize,
}

fn wiki_dir(root: &Path) -> PathBuf {
    root.join("wiki")
}

fn raw_dir(root: &Path) -> PathBuf {
    root.join("raw")
}

pub fn list_articles(root: &Path) -> Vec<ArticleMeta> {
    let wiki = wiki_dir(root);
    let mut articles = Vec::new();
    let matter = Matter::<YAML>::new();

    for entry in WalkDir::new(&wiki).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") {
            continue;
        }
        let filename = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        if filename.starts_with('_') {
            continue;
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let parsed = matter.parse(&content);
        let frontmatter = parsed.data.as_ref()
            .and_then(|d| d.as_hashmap().ok())
            .unwrap_or_default();

        let title = frontmatter.get("title")
            .and_then(|v| v.as_string().ok())
            .unwrap_or_else(|| filename.clone());

        let categories: Vec<String> = frontmatter.get("categories")
            .and_then(|v| v.as_vec().ok())
            .map(|v| v.iter().filter_map(|i| i.as_string().ok()).collect())
            .unwrap_or_default();

        let status = frontmatter.get("status")
            .and_then(|v| v.as_string().ok())
            .unwrap_or_else(|| "draft".to_string());

        let updated = frontmatter.get("updated")
            .and_then(|v| v.as_string().ok())
            .unwrap_or_default();

        let word_count = parsed.content.split_whitespace().count();

        articles.push(ArticleMeta {
            slug: filename,
            title,
            categories,
            status,
            word_count,
            updated,
        });
    }

    articles.sort_by(|a, b| b.updated.cmp(&a.updated));
    articles
}

pub fn read_article(root: &Path, slug: &str) -> Option<Article> {
    let path = wiki_dir(root).join(format!("{}.md", slug));
    let content = fs::read_to_string(&path).ok()?;
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);

    let frontmatter = parsed.data.as_ref()
        .and_then(|d| d.as_hashmap().ok())
        .unwrap_or_default();

    let title = frontmatter.get("title")
        .and_then(|v| v.as_string().ok())
        .unwrap_or_else(|| slug.to_string());

    let categories: Vec<String> = frontmatter.get("categories")
        .and_then(|v| v.as_vec().ok())
        .map(|v| v.iter().filter_map(|i| i.as_string().ok()).collect())
        .unwrap_or_default();

    let status = frontmatter.get("status")
        .and_then(|v| v.as_string().ok())
        .unwrap_or_else(|| "draft".to_string());

    let updated = frontmatter.get("updated")
        .and_then(|v| v.as_string().ok())
        .unwrap_or_default();

    let sources: Vec<String> = frontmatter.get("sources")
        .and_then(|v| v.as_vec().ok())
        .map(|v| v.iter().filter_map(|i| i.as_string().ok()).collect())
        .unwrap_or_default();

    Some(Article {
        slug: slug.to_string(),
        title,
        categories,
        status,
        updated,
        sources,
        body: parsed.content,
    })
}

pub fn get_stats(root: &Path) -> WikiStats {
    let articles = list_articles(root);
    let total_words: usize = articles.iter().map(|a| a.word_count).sum();

    let mut cat_map = std::collections::HashMap::new();
    for article in &articles {
        for cat in &article.categories {
            *cat_map.entry(cat.clone()).or_insert(0usize) += 1;
        }
    }
    let mut categories: Vec<CategoryCount> = cat_map
        .into_iter()
        .map(|(name, count)| CategoryCount { name, count })
        .collect();
    categories.sort_by(|a, b| b.count.cmp(&a.count));

    // Orphan detection: articles not linked from any other article
    let wiki = wiki_dir(root);
    let all_content: String = articles.iter().filter_map(|a| {
        fs::read_to_string(wiki.join(format!("{}.md", a.slug))).ok()
    }).collect::<Vec<_>>().join("\n");

    let orphans: Vec<String> = articles.iter()
        .filter(|a| !all_content.contains(&format!("[[{}]]", a.slug)))
        .map(|a| a.slug.clone())
        .collect();

    WikiStats {
        article_count: articles.len(),
        total_words,
        categories,
        orphans,
    }
}

pub fn get_index_file(root: &Path, name: &str) -> Option<String> {
    let path = wiki_dir(root).join(name);
    fs::read_to_string(path).ok()
}

pub fn get_backlinks(root: &Path, slug: &str) -> Vec<String> {
    let wiki = wiki_dir(root);
    let target = format!("[[{}]]", slug);
    let mut backlinks = Vec::new();

    for entry in WalkDir::new(&wiki).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map_or(true, |e| e != "md") {
            continue;
        }
        let filename = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        if filename.starts_with('_') || filename == slug {
            continue;
        }
        if let Ok(content) = fs::read_to_string(path) {
            if content.contains(&target) {
                backlinks.push(filename);
            }
        }
    }
    backlinks
}

pub fn get_recent_compilations(root: &Path, limit: usize) -> Vec<serde_json::Value> {
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");
    let content = fs::read_to_string(&log_path).unwrap_or_default();
    let mut entries: Vec<serde_json::Value> = content
        .lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();
    entries.reverse();
    entries.truncate(limit);
    entries
}

pub fn list_uncompiled(root: &Path) -> Vec<String> {
    let raw = raw_dir(root);
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");

    let compiled_files: std::collections::HashSet<String> = fs::read_to_string(&log_path)
        .unwrap_or_default()
        .lines()
        .filter_map(|line| {
            serde_json::from_str::<serde_json::Value>(line).ok()
        })
        .filter_map(|v| v.get("dest").and_then(|d| d.as_str().map(|s| s.to_string())))
        .collect();

    let mut uncompiled = Vec::new();
    for entry in WalkDir::new(&raw).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.file_name().map_or(false, |n| n == ".gitkeep") {
            continue;
        }
        let rel = path.strip_prefix(root).unwrap_or(path);
        let rel_str = rel.to_string_lossy().to_string();
        if !compiled_files.contains(&rel_str) {
            uncompiled.push(rel_str);
        }
    }

    uncompiled
}
```

- [ ] **Step 3: Register Tauri commands in lib.rs**

Replace `app/src-tauri/src/lib.rs`:

```rust
mod wiki;

use std::path::PathBuf;

fn project_root() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .expect("failed to get exe path")
        .parent()
        .expect("failed to get exe parent")
        .to_path_buf();

    // In dev mode, walk up from the target dir to find the project root
    // In production, the wiki dir should be configurable — for now, use cwd
    if cfg!(debug_assertions) {
        // Dev: src-tauri/target/debug/app -> walk up to knowledge-gpt/
        let mut dir = exe_dir.clone();
        loop {
            if dir.join("wiki").exists() && dir.join("raw").exists() {
                return dir;
            }
            if !dir.pop() {
                break;
            }
        }
    }
    std::env::current_dir().expect("failed to get cwd")
}

#[tauri::command]
fn list_articles() -> Vec<wiki::ArticleMeta> {
    wiki::list_articles(&project_root())
}

#[tauri::command]
fn read_article(slug: String) -> Option<wiki::Article> {
    wiki::read_article(&project_root(), &slug)
}

#[tauri::command]
fn get_stats() -> wiki::WikiStats {
    wiki::get_stats(&project_root())
}

#[tauri::command]
fn get_index_file(name: String) -> Option<String> {
    wiki::get_index_file(&project_root(), &name)
}

#[tauri::command]
fn list_uncompiled() -> Vec<String> {
    wiki::list_uncompiled(&project_root())
}

#[tauri::command]
fn get_backlinks(slug: String) -> Vec<String> {
    wiki::get_backlinks(&project_root(), &slug)
}

#[tauri::command]
fn get_recent_compilations(limit: usize) -> Vec<serde_json::Value> {
    wiki::get_recent_compilations(&project_root(), limit)
}

#[tauri::command]
fn open_in_editor(slug: String) -> Result<(), String> {
    let path = project_root().join("wiki").join(format!("{}.md", slug));
    open::that(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_articles,
            read_article,
            get_stats,
            get_index_file,
            list_uncompiled,
            get_backlinks,
            get_recent_compilations,
            open_in_editor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd app && pnpm tauri dev
```

Expected: App launches without Rust compilation errors. The frontend still shows the placeholder pages. Close it.

- [ ] **Step 5: Commit**

```bash
git add app/src-tauri/
git commit -m "feat: add Rust wiki module with list, read, stats, uncompiled commands"
```

---

### Task 5: Frontend — article list in sidebar + Reader page

**Files:**
- Create: `app/src/hooks/useTauriCommand.ts`
- Modify: `app/src/components/Sidebar.tsx`
- Modify: `app/src/pages/Reader.tsx`
- Create: `app/src/lib/types.ts`

- [ ] **Step 1: Install markdown rendering dependencies**

```bash
cd app
pnpm add react-markdown remark-gfm remark-wiki-link rehype-highlight rehype-slug rehype-autolink-headings
```

- [ ] **Step 2: Create shared types**

Create `app/src/lib/types.ts`:

```ts
export interface ArticleMeta {
  slug: string;
  title: string;
  categories: string[];
  status: string;
  word_count: number;
  updated: string;
}

export interface Article {
  slug: string;
  title: string;
  categories: string[];
  status: string;
  updated: string;
  sources: string[];
  body: string;
}

export interface WikiStats {
  article_count: number;
  total_words: number;
  categories: CategoryCount[];
  orphans: string[];
}

export interface CategoryCount {
  name: string;
  count: number;
}
```

- [ ] **Step 3: Create Tauri command hook**

Create `app/src/hooks/useTauriCommand.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useTauriCommand<T>(command: string, args?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    invoke<T>(command, args)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
    // Stringify args to stabilize the dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, JSON.stringify(args)]);

  return { data, loading, error, refetch: () => {
    setLoading(true);
    invoke<T>(command, args)
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }};
}
```

- [ ] **Step 4: Update Sidebar with real article list**

Replace `app/src/components/Sidebar.tsx`:

```tsx
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { ArticleMeta } from "@/lib/types";

export function Sidebar() {
  const location = useLocation();
  const { data: articles } = useTauriCommand<ArticleMeta[]>("list_articles");
  const { data: uncompiled } = useTauriCommand<string[]>("list_uncompiled");

  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/qa", label: "Q&A" },
  ];

  // Group articles by first category
  const grouped = new Map<string, ArticleMeta[]>();
  for (const article of articles ?? []) {
    const cat = article.categories[0] ?? "Uncategorized";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(article);
  }

  return (
    <aside className="w-60 border-r flex flex-col">
      <div className="p-4">
        <h1 className="text-lg font-bold">Knowledge GPT</h1>
      </div>
      <Separator />
      <nav className="p-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
              location.pathname === item.to
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
          <span>Uncompiled</span>
          <Badge variant="secondary">{uncompiled?.length ?? 0}</Badge>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 p-2">
        {grouped.size === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No articles yet</p>
        ) : (
          Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat} className="mb-3">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
                {cat}
              </p>
              {items.map((article) => (
                <Link
                  key={article.slug}
                  to={`/wiki/${article.slug}`}
                  className={`block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                    location.pathname === `/wiki/${article.slug}`
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground"
                  }`}
                >
                  {article.title}
                </Link>
              ))}
            </div>
          ))
        )}
      </ScrollArea>
    </aside>
  );
}
```

- [ ] **Step 5: Update Reader with markdown rendering**

Replace `app/src/pages/Reader.tsx`:

```tsx
import { useParams, Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/types";
import type { ComponentPropsWithoutRef } from "react";

function WikiLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href?.startsWith("/wiki/")) {
    return <Link to={href} className="text-primary underline">{children}</Link>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
}

function extractHeadings(markdown: string) {
  const headings: { depth: number; text: string; id: string }[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const text = match[2].trim();
      headings.push({
        depth: match[1].length,
        text,
        id: text.replace(/ /g, "-").toLowerCase(),
      });
    }
  }
  return headings;
}

export function Reader() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, loading } = useTauriCommand<Article>("read_article", { slug: slug ?? "" });
  const { data: backlinks } = useTauriCommand<string[]>("get_backlinks", { slug: slug ?? "" });

  if (!slug) {
    return (
      <div className="p-6 text-muted-foreground">Select an article from the sidebar.</div>
    );
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  if (!article) {
    return <div className="p-6 text-muted-foreground">Article not found: {slug}</div>;
  }

  const headings = extractHeadings(article.body);

  return (
    <div className="flex h-full">
      <ScrollArea className="flex-1">
        <article className="max-w-3xl mx-auto px-6 py-8">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => invoke("open_in_editor", { slug })}
              >
                Edit
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{article.status}</Badge>
              {article.categories.map((cat) => (
                <Badge key={cat} variant="secondary">{cat}</Badge>
              ))}
              {article.updated && <span>Updated: {article.updated}</span>}
            </div>
          </header>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                [remarkWikiLink, {
                  hrefTemplate: (permalink: string) => `/wiki/${permalink}`,
                  pageResolver: (name: string) => [name.replace(/ /g, "-").toLowerCase()],
                  aliasDivider: "|",
                }],
              ]}
              rehypePlugins={[rehypeHighlight, rehypeSlug]}
              components={{ a: WikiLink }}
            >
              {article.body}
            </ReactMarkdown>
          </div>

          {article.sources.length > 0 && (
            <footer className="mt-8 pt-4 border-t text-sm text-muted-foreground">
              <p className="font-medium mb-2">Sources:</p>
              <ul className="list-disc pl-5">
                {article.sources.map((src) => (
                  <li key={src}>{src}</li>
                ))}
              </ul>
            </footer>
          )}

          {(backlinks ?? []).length > 0 && (
            <div className="mt-6 pt-4 border-t text-sm">
              <p className="font-medium mb-2 text-muted-foreground">Backlinks:</p>
              <div className="flex flex-wrap gap-2">
                {backlinks!.map((bl) => (
                  <Link key={bl} to={`/wiki/${bl}`} className="text-primary underline text-sm">
                    {bl}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </ScrollArea>

      {/* Table of Contents sidebar */}
      {headings.length > 2 && (
        <aside className="w-48 border-l p-4 hidden lg:block">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">On this page</p>
          <nav className="space-y-1">
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                style={{ paddingLeft: `${(h.depth - 1) * 8}px` }}
              >
                {h.text}
              </a>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Add Tailwind typography plugin for prose styling**

```bash
cd app
pnpm add @tailwindcss/typography
```

Add to `app/src/styles.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

- [ ] **Step 7: Verify end-to-end**

```bash
cd app && pnpm tauri dev
```

Expected: Sidebar shows article list from `wiki/` (empty if no articles exist). The "Uncompiled" badge shows `0`. Navigating to a wiki article (if any exist) renders the markdown in the Reader page with proper styling. Close it.

- [ ] **Step 8: Commit**

```bash
git add app/src/
git commit -m "feat: connect sidebar to Rust backend, add markdown Reader with wiki-links"
```

---

## Phase 2 — Dashboard

### Task 6: Dashboard page with stats and health warnings

**Files:**
- Modify: `app/src/pages/Dashboard.tsx`

- [ ] **Step 1: Install a lightweight chart library**

```bash
cd app
pnpm add recharts
```

- [ ] **Step 2: Implement Dashboard page**

Replace `app/src/pages/Dashboard.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { WikiStats } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function Dashboard() {
  const { data: stats, loading } = useTauriCommand<WikiStats>("get_stats");
  const { data: uncompiled } = useTauriCommand<string[]>("list_uncompiled");
  const { data: recentCompilations } = useTauriCommand<Record<string, unknown>[]>("get_recent_compilations", { limit: 10 });

  if (loading || !stats) {
    return <div className="p-6 text-muted-foreground">Loading stats...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.article_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Words</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total_words.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.categories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uncompiled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{uncompiled?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown chart */}
      {stats.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Articles by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.categories}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Health warnings */}
      {stats.orphans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orphan Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              These articles are not linked from any other article:
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.orphans.map((slug) => (
                <Badge key={slug} variant="outline">{slug}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent compilations */}
      {(recentCompilations ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Compilations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {recentCompilations!.map((entry, i) => (
                <li key={i} className="flex justify-between text-muted-foreground">
                  <span>{String(entry.dest ?? entry.url ?? "unknown")}</span>
                  <span className="text-xs">{String(entry.timestamp ?? "").slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Uncompiled sources */}
      {(uncompiled?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uncompiled Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {uncompiled!.map((path) => (
                <li key={path} className="text-muted-foreground">{path}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify Dashboard**

```bash
cd app && pnpm tauri dev
```

Expected: Dashboard shows 4 stat cards (all zeros if wiki is empty). Category chart appears only when articles exist. Orphan and uncompiled sections appear conditionally. Close it.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/Dashboard.tsx app/package.json app/pnpm-lock.yaml
git commit -m "feat: add Dashboard with stats cards, category chart, health warnings"
```

---

## Phase 3 — Ingestion

### Task 7: Rust ingestion commands

**Files:**
- Create: `app/src-tauri/src/ingest.rs`
- Modify: `app/src-tauri/src/lib.rs`
- Modify: `app/src-tauri/Cargo.toml`

- [ ] **Step 1: Add reqwest dependency**

Add to `app/src-tauri/Cargo.toml` under `[dependencies]`:

```toml
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
regex = "1"
```

Also add to `app/src-tauri/Cargo.toml` under `[features]` if there's a `custom-protocol` feature, add `reqwest` to the allowed list. If Tauri's default features block HTTP, add `tauri` permission in `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "core:default",
    "opener:default"
  ]
}
```

No extra permissions needed for reqwest — it uses its own HTTP stack, not Tauri's.

- [ ] **Step 2: Create ingest module**

Create `app/src-tauri/src/ingest.rs`:

```rust
use chrono::Utc;
use regex::Regex;
use reqwest;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct IngestResult {
    pub dest: String,
    pub title: String,
}

fn slugify(text: &str) -> String {
    let re = Regex::new(r"[^\w\s-]").unwrap();
    let text = text.to_lowercase().trim().to_string();
    let text = re.replace_all(&text, "").to_string();
    let re2 = Regex::new(r"[\s_]+").unwrap();
    let text = re2.replace_all(&text, "-").to_string();
    text.chars().take(80).collect::<String>().trim_matches('-').to_string()
}

fn log_action(root: &Path, action: &str, details: serde_json::Value) {
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        let mut entry = details;
        entry["timestamp"] = serde_json::Value::String(Utc::now().to_rfc3339());
        entry["action"] = serde_json::Value::String(action.to_string());
        if let Ok(json) = serde_json::to_string(&entry) {
            use std::io::Write;
            let _ = writeln!(file, "{}", json);
        }
    }
}

pub async fn ingest_url(root: &Path, url: &str) -> Result<IngestResult, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (KnowledgeGPT/1.0)")
        .send()
        .await
        .map_err(|e| format!("Fetch failed: {}", e))?;

    let html = resp.text().await.map_err(|e| format!("Read failed: {}", e))?;

    // Simple title extraction: find <title> tag
    let title = extract_title(&html, url);
    let slug = slugify(&title);
    let now = Utc::now().format("%Y-%m-%d").to_string();

    // Simple HTML to text extraction (strip tags)
    let content = strip_html_tags(&html);

    let domain = url::Url::parse(url)
        .map(|u| u.host_str().unwrap_or("unknown").to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    let frontmatter = format!(
        "---\ntitle: \"{}\"\nsource_url: \"{}\"\nsource_domain: \"{}\"\ningested: {}\ntype: article\n---\n\n",
        title.replace('"', "\\\""), url, domain, now
    );

    let raw_dir = root.join("raw").join("articles");
    fs::create_dir_all(&raw_dir).map_err(|e| format!("mkdir failed: {}", e))?;

    let mut dest = raw_dir.join(format!("{}.md", slug));
    let mut counter = 1;
    while dest.exists() {
        dest = raw_dir.join(format!("{}-{}.md", slug, counter));
        counter += 1;
    }

    fs::write(&dest, format!("{}{}", frontmatter, content))
        .map_err(|e| format!("Write failed: {}", e))?;

    let rel = dest.strip_prefix(root).unwrap_or(&dest).to_string_lossy().to_string();
    log_action(root, "ingest_url", serde_json::json!({
        "url": url,
        "dest": &rel,
        "title": &title,
    }));

    Ok(IngestResult { dest: rel, title })
}

pub fn ingest_file(root: &Path, source_path: &str) -> Result<IngestResult, String> {
    let src = PathBuf::from(source_path);
    if !src.exists() {
        return Err(format!("File not found: {}", source_path));
    }

    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    let category = match ext.as_str() {
        "pdf" => "papers",
        "md" | "markdown" | "txt" => "articles",
        "csv" | "json" | "jsonl" => "datasets",
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" => "images",
        _ => "articles",
    };

    let raw_dir = root.join("raw").join(category);
    fs::create_dir_all(&raw_dir).map_err(|e| format!("mkdir failed: {}", e))?;

    let filename = src.file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut dest = raw_dir.join(&filename);
    let mut counter = 1;
    while dest.exists() {
        let stem = src.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let ext = src.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        dest = raw_dir.join(format!("{}-{}{}", stem, counter, ext));
        counter += 1;
    }

    fs::copy(&src, &dest).map_err(|e| format!("Copy failed: {}", e))?;

    let rel = dest.strip_prefix(root).unwrap_or(&dest).to_string_lossy().to_string();
    log_action(root, "ingest_file", serde_json::json!({
        "source": source_path,
        "dest": &rel,
    }));

    Ok(IngestResult { dest: rel, title: filename })
}

fn extract_title(html: &str, fallback_url: &str) -> String {
    // Look for <title>...</title>
    if let Some(start) = html.find("<title") {
        if let Some(tag_end) = html[start..].find('>') {
            let after_tag = start + tag_end + 1;
            if let Some(end) = html[after_tag..].find("</title>") {
                let title = html[after_tag..after_tag + end].trim().to_string();
                if !title.is_empty() {
                    return title;
                }
            }
        }
    }
    fallback_url.to_string()
}

fn strip_html_tags(html: &str) -> String {
    let re = Regex::new(r"<[^>]+>").unwrap();
    let text = re.replace_all(html, "").to_string();
    // Collapse whitespace
    let re2 = Regex::new(r"\n{3,}").unwrap();
    re2.replace_all(&text, "\n\n").trim().to_string()
}
```

- [ ] **Step 3: Add url crate dependency**

Add to `app/src-tauri/Cargo.toml`:

```toml
url = "2"
```

- [ ] **Step 4: Register ingest commands in lib.rs**

Add to `app/src-tauri/src/lib.rs`:

```rust
mod ingest;

// Add these command functions:

#[tauri::command]
async fn ingest_url(url: String) -> Result<ingest::IngestResult, String> {
    ingest::ingest_url(&project_root(), &url).await
}

#[tauri::command]
fn ingest_file(path: String) -> Result<ingest::IngestResult, String> {
    ingest::ingest_file(&project_root(), &path)
}
```

Add `ingest_url` and `ingest_file` to the `generate_handler!` macro:

```rust
.invoke_handler(tauri::generate_handler![
    list_articles,
    read_article,
    get_stats,
    get_index_file,
    list_uncompiled,
    ingest_url,
    ingest_file,
])
```

- [ ] **Step 5: Verify it compiles**

```bash
cd app && pnpm tauri dev
```

Expected: No compilation errors. Close it.

- [ ] **Step 6: Commit**

```bash
git add app/src-tauri/
git commit -m "feat: add Rust ingest module with URL fetch and file copy commands"
```

---

### Task 8: Frontend ingestion UX in sidebar

**Files:**
- Modify: `app/src/components/Sidebar.tsx`
- Create: `app/src/components/IngestDialog.tsx`

- [ ] **Step 1: Add dialog and input shadcn components (if not already added)**

```bash
cd app
pnpm dlx shadcn@latest add dialog input label
```

(Skip if already added in Task 2.)

- [ ] **Step 2: Create IngestDialog component**

Create `app/src/components/IngestDialog.tsx`:

```tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IngestDialogProps {
  onIngested: () => void;
}

export function IngestDialog({ onIngested }: IngestDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await invoke("ingest_url", { url: url.trim() });
      setUrl("");
      setOpen(false);
      onIngested();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          + Paste URL
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ingest URL</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? "Ingesting..." : "Ingest"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add IngestDialog and file drop to Sidebar**

In `app/src/components/Sidebar.tsx`, add the import and use it:

Add import at top:

```tsx
import { IngestDialog } from "./IngestDialog";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
```

Add file drop handler and the IngestDialog inside the sidebar, after the "Uncompiled" badge section:

```tsx
// Inside the Sidebar component, add state and handler:
const [dragOver, setDragOver] = useState(false);

const handleDrop = useCallback(async (e: React.DragEvent) => {
  e.preventDefault();
  setDragOver(false);
  const files = Array.from(e.dataTransfer.files);
  for (const file of files) {
    try {
      await invoke("ingest_file", { path: file.path });
    } catch (err) {
      console.error("Ingest failed:", err);
    }
  }
}, []);

// Add to JSX, after the Uncompiled badge section and before the ScrollArea:
<div className="p-2">
  <IngestDialog onIngested={() => window.location.reload()} />
</div>
<div
  className={`mx-2 mb-2 border-2 border-dashed rounded-md p-3 text-center text-xs text-muted-foreground transition-colors ${
    dragOver ? "border-primary bg-primary/5" : "border-border"
  }`}
  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
  onDragLeave={() => setDragOver(false)}
  onDrop={handleDrop}
>
  Drop files here
</div>
```

- [ ] **Step 4: Verify ingestion UX**

```bash
cd app && pnpm tauri dev
```

Expected: Sidebar shows "Paste URL" button and a drag-and-drop zone. Clicking "Paste URL" opens a dialog where you can enter a URL and click "Ingest". After ingesting, the uncompiled count updates. Close it.

- [ ] **Step 5: Commit**

```bash
git add app/src/
git commit -m "feat: add URL ingestion dialog and file drop zone to sidebar"
```

---

## Phase 4 — LLM Integration

### Task 9: Rust LLM provider abstraction

**Files:**
- Create: `app/src-tauri/src/llm/mod.rs`
- Create: `app/src-tauri/src/llm/claude.rs`
- Create: `app/src-tauri/src/llm/openai.rs`
- Create: `app/src-tauri/src/llm/gemini.rs`
- Create: `app/src-tauri/src/llm/ollama.rs`
- Create: `app/src-tauri/src/config.rs`
- Modify: `app/src-tauri/src/lib.rs`
- Modify: `app/src-tauri/Cargo.toml`

- [ ] **Step 1: Add futures dependency**

Add to `app/src-tauri/Cargo.toml`:

```toml
futures = "0.3"
```

- [ ] **Step 2: Create config module**

Create `app/src-tauri/src/config.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmConfig {
    pub provider: String,   // claude | openai | gemini | ollama
    pub api_key: String,
    pub model: String,
    pub ollama_endpoint: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub llm: LlmConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            llm: LlmConfig {
                provider: "claude".to_string(),
                api_key: String::new(),
                model: "claude-sonnet-4-5-20250514".to_string(),
                ollama_endpoint: "http://localhost:11434".to_string(),
            },
        }
    }
}

pub fn load_config(root: &Path) -> AppConfig {
    let path = root.join(".knowledge-gpt").join("config.yaml");
    if let Ok(content) = fs::read_to_string(&path) {
        serde_yaml::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

pub fn save_config(root: &Path, config: &AppConfig) -> Result<(), String> {
    let dir = root.join(".knowledge-gpt");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("config.yaml");
    let yaml = serde_yaml::to_string(config).map_err(|e| e.to_string())?;
    fs::write(path, yaml).map_err(|e| e.to_string())
}
```

Add `serde_yaml` to Cargo.toml:

```toml
serde_yaml = "0.9"
```

- [ ] **Step 3: Create LLM provider trait and module**

Create `app/src-tauri/src/llm/mod.rs`:

```rust
pub mod claude;
pub mod openai;
pub mod gemini;
pub mod ollama;

use crate::config::LlmConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,    // "user" | "assistant"
    pub content: String,
}

#[async_trait::async_trait]
pub trait LlmProvider: Send + Sync {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String>;
    async fn stream_complete(
        &self,
        system: &str,
        messages: Vec<Message>,
        on_token: Box<dyn Fn(String) + Send>,
    ) -> Result<String, String>;
}

pub fn create_provider(config: &LlmConfig) -> Box<dyn LlmProvider> {
    match config.provider.as_str() {
        "openai" => Box::new(openai::OpenAiProvider::new(config)),
        "gemini" => Box::new(gemini::GeminiProvider::new(config)),
        "ollama" => Box::new(ollama::OllamaProvider::new(config)),
        _ => Box::new(claude::ClaudeProvider::new(config)),
    }
}
```

Add `async-trait` to Cargo.toml:

```toml
async-trait = "0.1"
```

- [ ] **Step 4: Create Claude provider**

Create `app/src-tauri/src/llm/claude.rs`:

```rust
use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;
use reqwest;

pub struct ClaudeProvider {
    api_key: String,
    model: String,
}

impl ClaudeProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            api_key: config.api_key.clone(),
            model: config.model.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for ClaudeProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();
        let msgs: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();

        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 8192,
            "system": system,
            "messages": msgs,
        });

        let resp = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Parse failed: {}", e))?;

        json["content"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Unexpected response: {}", json))
    }

    async fn stream_complete(
        &self,
        system: &str,
        messages: Vec<Message>,
        on_token: Box<dyn Fn(String) + Send>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let msgs: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();

        let body = serde_json::json!({
            "model": self.model,
            "max_tokens": 8192,
            "system": system,
            "messages": msgs,
            "stream": true,
        });

        let resp = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let mut stream = resp.bytes_stream();
        let mut full_text = String::new();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" {
                        continue;
                    }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if json["type"] == "content_block_delta" {
                            if let Some(text) = json["delta"]["text"].as_str() {
                                full_text.push_str(text);
                                on_token(text.to_string());
                            }
                        }
                    }
                }
            }
        }

        Ok(full_text)
    }
}
```

- [ ] **Step 5: Create OpenAI provider**

Create `app/src-tauri/src/llm/openai.rs`:

```rust
use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;
use reqwest;

pub struct OpenAiProvider {
    api_key: String,
    model: String,
}

impl OpenAiProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            api_key: config.api_key.clone(),
            model: if config.model.is_empty() { "gpt-4o".to_string() } else { config.model.clone() },
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for OpenAiProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();
        let mut msgs = vec![serde_json::json!({ "role": "system", "content": system })];
        for m in &messages {
            msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }

        let body = serde_json::json!({
            "model": self.model,
            "messages": msgs,
        });

        let resp = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse failed: {}", e))?;

        json["choices"][0]["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Unexpected response: {}", json))
    }

    async fn stream_complete(
        &self,
        system: &str,
        messages: Vec<Message>,
        on_token: Box<dyn Fn(String) + Send>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let mut msgs = vec![serde_json::json!({ "role": "system", "content": system })];
        for m in &messages {
            msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }

        let body = serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": true,
        });

        let resp = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let mut stream = resp.bytes_stream();
        let mut full_text = String::new();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data == "[DONE]" { continue; }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(text) = json["choices"][0]["delta"]["content"].as_str() {
                            full_text.push_str(text);
                            on_token(text.to_string());
                        }
                    }
                }
            }
        }

        Ok(full_text)
    }
}
```

- [ ] **Step 6: Create Gemini provider**

Create `app/src-tauri/src/llm/gemini.rs`:

```rust
use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;
use reqwest;

pub struct GeminiProvider {
    api_key: String,
    model: String,
}

impl GeminiProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            api_key: config.api_key.clone(),
            model: if config.model.is_empty() { "gemini-2.5-pro".to_string() } else { config.model.clone() },
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for GeminiProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();

        let contents: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                let role = if m.role == "assistant" { "model" } else { "user" };
                serde_json::json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                })
            })
            .collect();

        let body = serde_json::json!({
            "system_instruction": { "parts": [{ "text": system }] },
            "contents": contents,
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );

        let resp = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse failed: {}", e))?;

        json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Unexpected response: {}", json))
    }

    async fn stream_complete(
        &self,
        system: &str,
        messages: Vec<Message>,
        on_token: Box<dyn Fn(String) + Send>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();

        let contents: Vec<serde_json::Value> = messages
            .iter()
            .map(|m| {
                let role = if m.role == "assistant" { "model" } else { "user" };
                serde_json::json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                })
            })
            .collect();

        let body = serde_json::json!({
            "system_instruction": { "parts": [{ "text": system }] },
            "contents": contents,
        });

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
            self.model, self.api_key
        );

        let resp = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let mut stream = resp.bytes_stream();
        let mut full_text = String::new();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                            full_text.push_str(text);
                            on_token(text.to_string());
                        }
                    }
                }
            }
        }

        Ok(full_text)
    }
}
```

- [ ] **Step 7: Create Ollama provider**

Create `app/src-tauri/src/llm/ollama.rs`:

```rust
use super::{LlmProvider, Message};
use crate::config::LlmConfig;
use futures::StreamExt;
use reqwest;

pub struct OllamaProvider {
    endpoint: String,
    model: String,
}

impl OllamaProvider {
    pub fn new(config: &LlmConfig) -> Self {
        Self {
            endpoint: if config.ollama_endpoint.is_empty() {
                "http://localhost:11434".to_string()
            } else {
                config.ollama_endpoint.clone()
            },
            model: if config.model.is_empty() { "llama3".to_string() } else { config.model.clone() },
        }
    }
}

#[async_trait::async_trait]
impl LlmProvider for OllamaProvider {
    async fn complete(&self, system: &str, messages: Vec<Message>) -> Result<String, String> {
        let client = reqwest::Client::new();
        let mut msgs = vec![serde_json::json!({ "role": "system", "content": system })];
        for m in &messages {
            msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }

        let body = serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": false,
        });

        let resp = client
            .post(format!("{}/api/chat", self.endpoint))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let json: serde_json::Value = resp.json().await.map_err(|e| format!("Parse failed: {}", e))?;

        json["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| format!("Unexpected response: {}", json))
    }

    async fn stream_complete(
        &self,
        system: &str,
        messages: Vec<Message>,
        on_token: Box<dyn Fn(String) + Send>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let mut msgs = vec![serde_json::json!({ "role": "system", "content": system })];
        for m in &messages {
            msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
        }

        let body = serde_json::json!({
            "model": self.model,
            "messages": msgs,
            "stream": true,
        });

        let resp = client
            .post(format!("{}/api/chat", self.endpoint))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let mut stream = resp.bytes_stream();
        let mut full_text = String::new();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.is_empty() { continue; }
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(text) = json["message"]["content"].as_str() {
                        full_text.push_str(text);
                        on_token(text.to_string());
                    }
                }
            }
        }

        Ok(full_text)
    }
}
```

- [ ] **Step 8: Register config commands in lib.rs**

Add to `app/src-tauri/src/lib.rs`:

```rust
mod config;
mod llm;

#[tauri::command]
fn get_config() -> config::AppConfig {
    config::load_config(&project_root())
}

#[tauri::command]
fn set_config(config: config::AppConfig) -> Result<(), String> {
    config::save_config(&project_root(), &config)
}
```

Add `get_config` and `set_config` to `generate_handler!`.

- [ ] **Step 9: Verify it compiles**

```bash
cd app && pnpm tauri dev
```

Expected: No compilation errors. Close it.

- [ ] **Step 10: Commit**

```bash
git add app/src-tauri/
git commit -m "feat: add LLM provider abstraction (Claude, OpenAI, Gemini, Ollama) and config module"
```

---

### Task 10: Compile command — wire LLM to wiki compilation

**Files:**
- Create: `app/src-tauri/src/compile.rs`
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Create compile module**

Create `app/src-tauri/src/compile.rs`:

```rust
use crate::config;
use crate::llm::{self, Message};
use crate::wiki;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileResult {
    pub articles_created: Vec<String>,
    pub articles_updated: Vec<String>,
}

pub async fn compile(root: &Path, raw_paths: Vec<String>) -> Result<CompileResult, String> {
    let cfg = config::load_config(root);
    let provider = llm::create_provider(&cfg.llm);

    // Read CLAUDE.md for compilation instructions
    let claude_md = fs::read_to_string(root.join("CLAUDE.md")).unwrap_or_default();

    // Read existing wiki index for context
    let index = wiki::get_index_file(root, "_index.md").unwrap_or_default();
    let concepts = wiki::get_index_file(root, "_concepts.md").unwrap_or_default();

    // Read raw sources
    let mut raw_contents = Vec::new();
    for path in &raw_paths {
        let full_path = root.join(path);
        match fs::read_to_string(&full_path) {
            Ok(content) => raw_contents.push(format!("## Source: {}\n\n{}", path, content)),
            Err(e) => return Err(format!("Failed to read {}: {}", path, e)),
        }
    }

    let system_prompt = format!(
        "You are a knowledge base compiler. Follow these instructions exactly:\n\n{}\n\n\
        Current wiki index:\n{}\n\nCurrent concepts:\n{}\n\n\
        IMPORTANT: Return your response as one or more wiki articles in this exact format:\n\
        For each article, output:\n\
        ===FILE: <filename>.md===\n\
        <full article content with frontmatter>\n\
        ===END FILE===\n\n\
        Also output index updates in the same format for _index.md, _concepts.md, _categories.md, and _recent.md.\n\
        Use today's date: {}",
        claude_md, index, concepts, Utc::now().format("%Y-%m-%d")
    );

    let user_msg = format!(
        "Compile the following raw source(s) into wiki articles:\n\n{}",
        raw_contents.join("\n\n---\n\n")
    );

    let response = provider
        .complete(&system_prompt, vec![Message { role: "user".to_string(), content: user_msg }])
        .await?;

    // Parse response into files
    let mut result = CompileResult {
        articles_created: Vec::new(),
        articles_updated: Vec::new(),
    };

    let wiki_dir = root.join("wiki");
    let file_re = regex::Regex::new(r"===FILE: (.+?)===\n([\s\S]*?)===END FILE===").unwrap();

    for cap in file_re.captures_iter(&response) {
        let filename = cap[1].trim();
        let content = cap[2].trim();

        let dest = wiki_dir.join(filename);
        let existed = dest.exists();

        fs::write(&dest, content).map_err(|e| format!("Write failed: {}", e))?;

        if existed {
            result.articles_updated.push(filename.to_string());
        } else {
            result.articles_created.push(filename.to_string());
        }
    }

    // Log the compilation
    let log_path = root.join(".knowledge-gpt").join("compile_log.jsonl");
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        use std::io::Write;
        for raw_path in &raw_paths {
            let entry = serde_json::json!({
                "timestamp": Utc::now().to_rfc3339(),
                "action": "compile",
                "dest": raw_path,
                "articles_created": result.articles_created,
                "articles_updated": result.articles_updated,
            });
            let _ = writeln!(file, "{}", serde_json::to_string(&entry).unwrap_or_default());
        }
    }

    Ok(result)
}
```

- [ ] **Step 2: Register compile command in lib.rs**

Add to `app/src-tauri/src/lib.rs`:

```rust
mod compile;

#[tauri::command]
async fn compile_sources(raw_paths: Vec<String>) -> Result<compile::CompileResult, String> {
    compile::compile(&project_root(), raw_paths).await
}
```

Add `compile_sources` to `generate_handler!`.

- [ ] **Step 3: Verify it compiles**

```bash
cd app && pnpm tauri dev
```

Expected: No Rust compilation errors. Close it.

- [ ] **Step 4: Commit**

```bash
git add app/src-tauri/
git commit -m "feat: add compile command that sends raw sources to LLM and writes wiki articles"
```

---

### Task 11: Q&A chat page with streaming

**Files:**
- Modify: `app/src/pages/QA.tsx`
- Modify: `app/src-tauri/src/lib.rs`

- [ ] **Step 1: Add Tauri ask command with channel streaming**

Add to `app/src-tauri/src/lib.rs`:

```rust
use tauri::ipc::Channel;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
enum StreamEvent {
    #[serde(rename_all = "camelCase")]
    Token { text: String },
    #[serde(rename_all = "camelCase")]
    Done { full_text: String },
    #[serde(rename_all = "camelCase")]
    Error { message: String },
}

#[tauri::command]
async fn ask(question: String, on_event: Channel<StreamEvent>) -> Result<(), String> {
    let root = project_root();
    let cfg = config::load_config(&root);
    let provider = llm::create_provider(&cfg.llm);

    // Gather wiki context
    let index = wiki::get_index_file(&root, "_index.md").unwrap_or_default();
    let articles = wiki::list_articles(&root);

    // Select relevant articles (simple: include up to 5 based on title keyword match)
    let q_lower = question.to_lowercase();
    let mut relevant_content = String::new();
    let mut count = 0;
    for article in &articles {
        if count >= 5 { break; }
        let title_lower = article.title.to_lowercase();
        let cats_lower: Vec<String> = article.categories.iter().map(|c| c.to_lowercase()).collect();
        let q_words: Vec<&str> = q_lower.split_whitespace().collect();

        let is_relevant = q_words.iter().any(|w| title_lower.contains(w))
            || cats_lower.iter().any(|c| q_words.iter().any(|w| c.contains(w)));

        if is_relevant {
            if let Some(a) = wiki::read_article(&root, &article.slug) {
                relevant_content.push_str(&format!("\n\n## {}\n{}", a.title, a.body));
                count += 1;
            }
        }
    }

    let system = format!(
        "You are a knowledge assistant. Answer questions based on the wiki content below. \
        Cite articles using [[article-slug]] wiki-link syntax. If the wiki doesn't have enough \
        information, say so.\n\nWiki Index:\n{}\n\nRelevant Articles:\n{}",
        index, relevant_content
    );

    let on_event_clone = on_event.clone();
    let result = provider
        .stream_complete(
            &system,
            vec![llm::Message { role: "user".to_string(), content: question }],
            Box::new(move |token| {
                let _ = on_event_clone.send(StreamEvent::Token { text: token });
            }),
        )
        .await;

    match result {
        Ok(full_text) => {
            let _ = on_event.send(StreamEvent::Done { full_text });
            Ok(())
        }
        Err(e) => {
            let _ = on_event.send(StreamEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}
```

Add `ask` to `generate_handler!`.

- [ ] **Step 2: Add file_answer command**

Add to `app/src-tauri/src/lib.rs`:

```rust
#[tauri::command]
fn file_answer(question: String, answer: String) -> Result<String, String> {
    let root = project_root();
    let slug = question
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-')
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .take(60)
        .collect::<String>();

    let now = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let content = format!(
        "---\ntitle: \"{}\"\ncategories: [\"Q&A\"]\nsources: []\ncreated: {}\nupdated: {}\nstatus: draft\n---\n\n# {}\n\n> {}\n\n{}\n",
        question.replace('"', "\\\""), now, now, question, question, answer
    );

    let dest = root.join("wiki").join(format!("{}.md", slug));
    std::fs::write(&dest, content).map_err(|e| format!("Write failed: {}", e))?;

    Ok(slug)
}
```

Add `file_answer` to `generate_handler!`.

- [ ] **Step 3: Implement Q&A chat frontend**

Replace `app/src/pages/QA.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import { Link } from "react-router-dom";
import type { ComponentPropsWithoutRef } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function WikiLink({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href?.startsWith("/wiki/")) {
    return <Link to={href} className="text-primary underline">{children}</Link>;
  }
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
}

const remarkPlugins = [
  remarkGfm,
  [remarkWikiLink, {
    hrefTemplate: (permalink: string) => `/wiki/${permalink}`,
    pageResolver: (name: string) => [name.replace(/ /g, "-").toLowerCase()],
    aliasDivider: "|",
  }],
] as any;

export function QA() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setStreaming(true);

    // Add empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    interface StreamEvent {
      event: "token" | "done" | "error";
      data: { text?: string; fullText?: string; message?: string };
    }

    const onEvent = new Channel<StreamEvent>();
    onEvent.onmessage = (event: StreamEvent) => {
      if (event.event === "token" && event.data.text) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content += event.data.text;
          }
          return updated;
        });
      } else if (event.event === "done") {
        setStreaming(false);
      } else if (event.event === "error") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            last.content = `Error: ${event.data.message}`;
          }
          return updated;
        });
        setStreaming(false);
      }
    };

    try {
      await invoke("ask", { question, onEvent });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.content = `Error: ${err}`;
        }
        return updated;
      });
      setStreaming(false);
    }
  }

  async function handleFileAnswer(question: string, answer: string) {
    try {
      const slug = await invoke<string>("file_answer", { question, answer });
      alert(`Filed to wiki: ${slug}`);
    } catch (err) {
      alert(`Failed: ${err}`);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Q&A</h2>
        <p className="text-sm text-muted-foreground">Ask questions about your knowledge base</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-4 py-3 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" ? (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={remarkPlugins}
                        components={{ a: WikiLink }}
                      >
                        {msg.content || "..."}
                      </ReactMarkdown>
                    </div>
                    {msg.content && !streaming && i > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => {
                          const userMsg = messages[i - 1];
                          if (userMsg?.role === "user") {
                            handleFileAnswer(userMsg.content, msg.content);
                          }
                        }}
                      >
                        File to wiki
                      </Button>
                    )}
                  </>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={streaming}
            className="flex-1"
          />
          <Button type="submit" disabled={streaming || !input.trim()}>
            {streaming ? "..." : "Ask"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify Q&A page**

```bash
cd app && pnpm tauri dev
```

Expected: Q&A page shows a chat interface. Typing a question and clicking "Ask" sends it to the configured LLM (will error if no API key configured — that's expected). The UI handles streaming tokens and error states. Close it.

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add Q&A chat page with LLM streaming and file-to-wiki support"
```

---

### Task 12: Cmd+K search overlay

**Files:**
- Create: `app/src/components/CommandPalette.tsx`
- Modify: `app/src/components/Layout.tsx`

- [ ] **Step 1: Add command dialog shadcn component**

```bash
cd app
pnpm add cmdk
pnpm dlx shadcn@latest add command
```

- [ ] **Step 2: Create CommandPalette component**

Create `app/src/components/CommandPalette.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTauriCommand } from "@/hooks/useTauriCommand";
import type { ArticleMeta } from "@/lib/types";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: articles } = useTauriCommand<ArticleMeta[]>("list_articles");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSelect(slug: string) {
    setOpen(false);
    navigate(`/wiki/${slug}`);
  }

  function handleAskInQA(query: string) {
    setOpen(false);
    navigate(`/qa?q=${encodeURIComponent(query)}`);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search articles or ask a question..." />
      <CommandList>
        <CommandEmpty>
          <button
            className="w-full text-left px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>("[cmdk-input]");
              if (input?.value) handleAskInQA(input.value);
            }}
          >
            Ask in Q&A...
          </button>
        </CommandEmpty>
        <CommandGroup heading="Articles">
          {(articles ?? []).map((article) => (
            <CommandItem
              key={article.slug}
              value={article.title}
              onSelect={() => handleSelect(article.slug)}
            >
              <span>{article.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {article.categories[0] ?? ""}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { setOpen(false); navigate("/"); }}>
            Go to Dashboard
          </CommandItem>
          <CommandItem onSelect={() => { setOpen(false); navigate("/qa"); }}>
            Open Q&A
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 3: Add CommandPalette to Layout**

Update `app/src/components/Layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";

export function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}
```

- [ ] **Step 4: Verify Cmd+K overlay**

```bash
cd app && pnpm tauri dev
```

Expected: Pressing Cmd+K (or Ctrl+K) opens a search overlay. Typing filters articles. Selecting an article navigates to it. "Ask in Q&A" option appears when no articles match. Close it.

- [ ] **Step 5: Commit**

```bash
git add app/src/
git commit -m "feat: add Cmd+K command palette for quick article search and navigation"
```

---

## Phase 5 — Polish

### Task 13: Settings modal

**Files:**
- Create: `app/src/components/SettingsDialog.tsx`
- Modify: `app/src/components/Sidebar.tsx`
- Create: `app/src/lib/config-types.ts`

- [ ] **Step 1: Create config types**

Create `app/src/lib/config-types.ts`:

```ts
export interface LlmConfig {
  provider: string;
  api_key: string;
  model: string;
  ollama_endpoint: string;
}

export interface AppConfig {
  llm: LlmConfig;
}
```

- [ ] **Step 2: Create SettingsDialog component**

Create `app/src/components/SettingsDialog.tsx`:

```tsx
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppConfig } from "@/lib/config-types";

const PROVIDERS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini (Google)" },
  { value: "ollama", label: "Ollama (Local)" },
];

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      invoke<AppConfig>("get_config").then(setConfig).catch(console.error);
    }
  }, [open]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await invoke("set_config", { config });
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function updateLlm(field: string, value: string) {
    if (!config) return;
    setConfig({ ...config, llm: { ...config.llm, [field]: value } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-2 rounded-md hover:bg-accent text-muted-foreground" title="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        {config && (
          <div className="space-y-4">
            <div>
              <Label>LLM Provider</Label>
              <select
                className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                value={config.llm.provider}
                onChange={(e) => updateLlm("provider", e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {config.llm.provider !== "ollama" && (
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={config.llm.api_key}
                  onChange={(e) => updateLlm("api_key", e.target.value)}
                  placeholder="sk-..."
                />
              </div>
            )}
            <div>
              <Label>Model</Label>
              <Input
                value={config.llm.model}
                onChange={(e) => updateLlm("model", e.target.value)}
                placeholder={config.llm.provider === "claude" ? "claude-sonnet-4-5-20250514" : "model name"}
              />
            </div>
            {config.llm.provider === "ollama" && (
              <div>
                <Label>Ollama Endpoint</Label>
                <Input
                  value={config.llm.ollama_endpoint}
                  onChange={(e) => updateLlm("ollama_endpoint", e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add SettingsDialog to Sidebar footer**

In `app/src/components/Sidebar.tsx`, add the import and place it at the bottom of the sidebar:

```tsx
import { SettingsDialog } from "./SettingsDialog";

// At the bottom of the aside, after ScrollArea:
<Separator />
<div className="p-2 flex items-center justify-between">
  <SettingsDialog />
</div>
```

- [ ] **Step 4: Verify settings modal**

```bash
cd app && pnpm tauri dev
```

Expected: Gear icon appears in sidebar footer. Clicking it opens settings modal with provider dropdown, API key input, model input, and Ollama endpoint (shown conditionally). Saving writes to `.knowledge-gpt/config.yaml`. Close it.

- [ ] **Step 5: Commit**

```bash
git add app/src/
git commit -m "feat: add settings modal for LLM provider configuration"
```

---

### Task 14: File watcher for live updates

**Files:**
- Create: `app/src-tauri/src/watcher.rs`
- Modify: `app/src-tauri/src/lib.rs`
- Create: `app/src/hooks/useFileWatcher.ts`
- Modify: `app/src/components/Sidebar.tsx`

- [ ] **Step 1: Add notify dependency**

Add to `app/src-tauri/Cargo.toml`:

```toml
notify = "8"
```

- [ ] **Step 2: Create watcher module**

Create `app/src-tauri/src/watcher.rs`:

```rust
use notify::{Event, EventKind, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use tauri::Emitter;

#[derive(Clone, Serialize)]
pub struct FileChangePayload {
    pub path: String,
    pub kind: String,
}

pub fn start_watcher(app_handle: tauri::AppHandle, root_path: String) {
    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = notify::recommended_watcher(tx).expect("Failed to create watcher");

        let wiki_path = Path::new(&root_path).join("wiki");
        let raw_path = Path::new(&root_path).join("raw");

        if wiki_path.exists() {
            watcher
                .watch(&wiki_path, RecursiveMode::Recursive)
                .expect("Failed to watch wiki/");
        }
        if raw_path.exists() {
            watcher
                .watch(&raw_path, RecursiveMode::Recursive)
                .expect("Failed to watch raw/");
        }

        for res in rx {
            if let Ok(event) = res {
                let kind = match event.kind {
                    EventKind::Create(_) => "create",
                    EventKind::Modify(_) => "modify",
                    EventKind::Remove(_) => "remove",
                    _ => continue,
                };

                for path in &event.paths {
                    let _ = app_handle.emit(
                        "file-changed",
                        FileChangePayload {
                            path: path.to_string_lossy().to_string(),
                            kind: kind.to_string(),
                        },
                    );
                }
            }
        }
    });
}
```

- [ ] **Step 3: Start watcher on app launch**

In `app/src-tauri/src/lib.rs`, update the `run()` function:

```rust
mod watcher;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_articles,
            read_article,
            get_stats,
            get_index_file,
            list_uncompiled,
            get_backlinks,
            get_recent_compilations,
            open_in_editor,
            ingest_url,
            ingest_file,
            get_config,
            set_config,
            compile_sources,
            ask,
            file_answer,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let root = project_root().to_string_lossy().to_string();
            watcher::start_watcher(handle, root);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Create frontend file watcher hook**

Create `app/src/hooks/useFileWatcher.ts`:

```ts
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

interface FileChangePayload {
  path: string;
  kind: string;
}

export function useFileWatcher(onChange: (payload: FileChangePayload) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<FileChangePayload>("file-changed", (event) => {
      onChange(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [onChange]);
}
```

- [ ] **Step 5: Use file watcher in Sidebar to auto-refresh article list**

In `app/src/components/Sidebar.tsx`, add:

```tsx
import { useFileWatcher } from "@/hooks/useFileWatcher";
import { useCallback } from "react";

// Inside the Sidebar component:
const { refetch: refetchArticles } = useTauriCommand<ArticleMeta[]>("list_articles");
const { refetch: refetchUncompiled } = useTauriCommand<string[]>("list_uncompiled");

const handleFileChange = useCallback(() => {
  refetchArticles();
  refetchUncompiled();
}, [refetchArticles, refetchUncompiled]);

useFileWatcher(handleFileChange);
```

Note: This requires refactoring `useTauriCommand` to return a stable `refetch` reference — the hook already returns `refetch`, so use it from the existing destructured return.

- [ ] **Step 6: Verify file watcher**

```bash
cd app && pnpm tauri dev
```

In a separate terminal, create a test file:

```bash
touch /Users/anchitgupta/Documents/Github/knowledge-gpt/raw/articles/test.md
```

Expected: The "Uncompiled" badge in the sidebar updates automatically without page refresh. Delete the test file after verifying.

- [ ] **Step 7: Commit**

```bash
git add app/
git commit -m "feat: add file watcher for live UI updates on raw/ and wiki/ changes"
```

---

### Task 15: Theme toggle (light/dark)

**Files:**
- Create: `app/src/hooks/useTheme.ts`
- Modify: `app/src/components/Sidebar.tsx`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Create theme hook**

Create `app/src/hooks/useTheme.ts`:

```ts
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (theme === "dark" || (theme === "system" && systemDark)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const root = document.documentElement;
        if (mq.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
  }

  return { theme, setTheme };
}
```

- [ ] **Step 2: Add theme toggle to Sidebar footer**

In `app/src/components/Sidebar.tsx`, update the footer section:

```tsx
import { useTheme } from "@/hooks/useTheme";

// Inside the component:
const { theme, setTheme } = useTheme();

// In the footer div (alongside SettingsDialog):
<div className="p-2 flex items-center justify-between">
  <SettingsDialog />
  <button
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    className="p-2 rounded-md hover:bg-accent text-muted-foreground"
    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
  >
    {theme === "dark" ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    )}
  </button>
</div>
```

- [ ] **Step 3: Verify theme toggle**

```bash
cd app && pnpm tauri dev
```

Expected: Theme toggle button in sidebar footer switches between light and dark mode. Preference persists across restarts via localStorage. Close it.

- [ ] **Step 4: Commit**

```bash
git add app/src/
git commit -m "feat: add light/dark theme toggle with system preference detection"
```

---

### Task 16: Compile button on uncompiled sources

**Files:**
- Create: `app/src/components/UncompiledList.tsx`
- Modify: `app/src/components/Sidebar.tsx`

- [ ] **Step 1: Create UncompiledList component**

Create `app/src/components/UncompiledList.tsx`:

```tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UncompiledListProps {
  paths: string[];
  onCompiled: () => void;
}

export function UncompiledList({ paths, onCompiled }: UncompiledListProps) {
  const [compiling, setCompiling] = useState<string | null>(null);

  async function handleCompile(path: string) {
    setCompiling(path);
    try {
      await invoke("compile_sources", { rawPaths: [path] });
      onCompiled();
    } catch (err) {
      console.error("Compile failed:", err);
      alert(`Compile failed: ${err}`);
    } finally {
      setCompiling(null);
    }
  }

  async function handleCompileAll() {
    setCompiling("all");
    try {
      await invoke("compile_sources", { rawPaths: paths });
      onCompiled();
    } catch (err) {
      console.error("Compile all failed:", err);
      alert(`Compile failed: ${err}`);
    } finally {
      setCompiling(null);
    }
  }

  if (paths.length === 0) return null;

  return (
    <div className="space-y-1">
      {paths.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-1"
          onClick={handleCompileAll}
          disabled={compiling !== null}
        >
          {compiling === "all" ? "Compiling..." : `Compile All (${paths.length})`}
        </Button>
      )}
      {paths.map((path) => {
        const filename = path.split("/").pop() ?? path;
        return (
          <div key={path} className="flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-accent">
            <span className="truncate flex-1 text-muted-foreground" title={path}>
              {filename}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleCompile(path)}
              disabled={compiling !== null}
            >
              {compiling === path ? "..." : "Compile"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire UncompiledList into Sidebar**

In `app/src/components/Sidebar.tsx`, replace the static "Uncompiled" badge section with:

```tsx
import { UncompiledList } from "./UncompiledList";
import { useState } from "react";

// Inside the component, add state for showing uncompiled list:
const [showUncompiled, setShowUncompiled] = useState(false);

// Replace the uncompiled badge div:
<div className="p-2">
  <button
    onClick={() => setShowUncompiled(!showUncompiled)}
    className="flex items-center justify-between w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-md"
  >
    <span>Uncompiled</span>
    <Badge variant="secondary">{uncompiled?.length ?? 0}</Badge>
  </button>
  {showUncompiled && uncompiled && (
    <div className="mt-1">
      <UncompiledList
        paths={uncompiled}
        onCompiled={() => {
          refetchArticles();
          refetchUncompiled();
        }}
      />
    </div>
  )}
</div>
```

- [ ] **Step 3: Verify compile buttons**

```bash
cd app && pnpm tauri dev
```

Expected: Clicking "Uncompiled" in sidebar expands a list of uncompiled raw sources. Each has a "Compile" button. Clicking compile sends to LLM and writes wiki articles (requires API key configured). "Compile All" button appears when there are 2+ sources. Close it.

- [ ] **Step 4: Commit**

```bash
git add app/src/
git commit -m "feat: add compile buttons for uncompiled sources in sidebar"
```

---

### Task 17: Final integration — verify all flows end-to-end

**Files:** None (testing only)

- [ ] **Step 1: Set up config with an API key**

Create or edit `.knowledge-gpt/config.yaml`:

```yaml
llm:
  provider: claude
  api_key: YOUR_KEY_HERE
  model: claude-sonnet-4-5-20250514
  ollama_endpoint: http://localhost:11434
```

- [ ] **Step 2: Test ingestion flow**

```bash
cd app && pnpm tauri dev
```

In the app:
1. Click "Paste URL" in sidebar
2. Enter a test URL
3. Verify it appears in the "Uncompiled" list

- [ ] **Step 3: Test compilation flow**

1. Click "Compile" on the ingested source
2. Verify a new wiki article appears in the sidebar
3. Click the article to verify it renders in the Reader

- [ ] **Step 4: Test Q&A flow**

1. Navigate to Q&A
2. Ask a question about the compiled article
3. Verify streaming response with wiki-link citations
4. Click "File to wiki" on an answer
5. Verify it appears as a new article

- [ ] **Step 5: Test Cmd+K**

1. Press Cmd+K
2. Type article name — verify it filters
3. Select article — verify navigation to Reader

- [ ] **Step 6: Test external edit detection**

In a terminal:

```bash
echo "test" >> /Users/anchitgupta/Documents/Github/knowledge-gpt/wiki/_index.md
```

Verify sidebar refreshes without manual reload.

- [ ] **Step 7: Test theme toggle**

Click the sun/moon icon in sidebar footer. Verify light/dark switch. Verify persistence after closing and reopening the app.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: verify all flows working end-to-end"
```
