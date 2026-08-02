# context-mcp — Design Specification

> **Status**: ✅ BUILT — server.py complete and tested 2026-03-09
> **Priority**: HIGH — this solves the "coding in circles / restart" problem

## Problem Being Solved

AI sessions lack context of prior sessions → reimplement same things differently → within-file
divergence → user must restart clean. The problem is NOT filename convergence; it is within-file
divergence. Even two CHECKLISTs cause forking because they create competing definitions of "done."

**Root cause**: No session ever knows:
1. What the previous session actually did (vs. intended)
2. What the single canonical CHECKLIST says right now
3. What named entities (functions/classes/types) exist and where

**Solution**: MCP server every AI tool calls at session start → `session_briefing()` → full context
in one call. No more exploring from scratch.

## Architecture

```
context-mcp/
  server.py          ← MCP stdio server (no external deps)
  context.db         ← Read-write SQLite: session intents, entity registry, checklist state
  README.md          ← Setup instructions for each tool

External (read-only):
  ~/Documents/com.pieces.os/production/Pieces/couchbase.cblite2/db.sqlite3
    ← Pieces LTM: 21,640+ workstream events, 712 summaries
    ← Query ONLY c2windowTitle + clipboard (clean fields) — NOT OCR (c0readable, c10 ocrText)
  git subprocess     ← Authoritative file state
```

## MCP Tools to Implement

### 1. `session_briefing(project_name)` — PRIMARY TOOL
Returns everything a new session needs:
- Last 3 session summaries from Pieces (using window title to filter by project)
- Full CHECKLIST.md parsed into structured items with status
- Recent git log (last 10 commits, short)
- In-progress items (unchecked boxes from CHECKLIST)
- Named entity registry (all known functions/classes/types + canonical file)
- Any session intents recorded by previous session that weren't completed

### 2. `get_checklist(project_name)`
- Parse CHECKLIST.md from project root
- Return structured: `[{ id, text, status, section, priority }]`
- Single source of truth — never create a parallel checklist

### 3. `mark_checklist_item(project_name, item_text, status, note)`
- Update checklist item state in context.db (cache layer over CHECKLIST.md)
- Returns updated item

### 4. `record_session_intent(project_name, intent, files_to_touch, session_id)`
- Save what THIS session plans to do before it starts coding
- Prevents two sessions from touching the same files with different goals
- Stored in context.db `session_intents` table

### 5. `get_recent_sessions(project_name, n=5)`
- Query Pieces `db.sqlite3` for events with project in window title
- Use summaries table if available, fall back to event clustering
- Returns: `[{ date, summary, files_mentioned, git_commits }]`

### 6. `get_entity_registry(project_name)`
- Return all named entities: `[{ name, type, file, line, last_seen }]`
- Types: function, class, interface, type, constant, endpoint, table
- Used to answer "what is X and where is it?"

### 7. `register_entity(project_name, name, type, file, line)`
- Add or update an entity
- Called by coding agents after creating/moving named things

### 8. `search_history(project_name, query)`
- Full-text search over Pieces summaries for this project
- Returns: `[{ date, summary_text, relevance }]`

## Data Sources

### Pieces DB (READ-ONLY)
```python
PIECES_DB = '/home/robin/Documents/com.pieces.os/production/Pieces/couchbase.cblite2/db.sqlite3'
EVENTS_FTS = 'kv_.workstream\\Events::workstream\\Events\\Full\\Text\\Search\\Index_content'

# RELIABLE columns:
#   c2windowTitle  — OS window manager API, perfect fidelity
#   c6context.native_clipboard.content.text — OS clipboard API, perfect fidelity
#
# UNRELIABLE (DO NOT USE for path extraction):
#   c0readable     — Pieces OCR post-processed, character substitutions
#   c10context.native_ocr.ocrText — Raw OCR, very noisy
```

### context.db Schema (READ-WRITE)
```sql
CREATE TABLE session_intents (
  id INTEGER PRIMARY KEY,
  project TEXT NOT NULL,
  session_id TEXT,
  intent TEXT NOT NULL,
  files_to_touch TEXT,  -- JSON array
  started_at TEXT,
  completed_at TEXT,
  outcome TEXT
);

CREATE TABLE entity_registry (
  id INTEGER PRIMARY KEY,
  project TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,    -- function|class|interface|type|constant|endpoint|table
  file TEXT NOT NULL,
  line INTEGER,
  last_seen TEXT,
  UNIQUE(project, name, type)
);

CREATE TABLE checklist_cache (
  project TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending|in_progress|done|blocked
  note TEXT,
  updated_at TEXT,
  PRIMARY KEY (project, item_id)
);
```

## MCP Protocol

- Transport: stdio (JSON-RPC 2.0)
- No external dependencies (stdlib only: json, sqlite3, subprocess, os, sys)
- Works with: Claude Code, Windsurf, VSCode/Roo, Gemini CLI, Codex CLI, Antigravity

## Config Snippets (per tool)

### Claude Code (.mcp.json in project root)
```json
{
  "mcpServers": {
    "context": {
      "command": "python3",
      "args": ["/home/robin/Antigravity/tools/context-mcp/server.py"]
    }
  }
}
```

### Windsurf (mcp_config.json)
```json
{
  "mcpServers": {
    "context": {
      "command": "python3",
      "args": ["/home/robin/Antigravity/tools/context-mcp/server.py"]
    }
  }
}
```

## Implementation Notes

- `server.py` reads from stdin, writes to stdout
- One thread per request (no concurrency needed for local MCP)
- Pieces DB opened read-only: `sqlite3.connect(f'file:{PIECES_DB}?mode=ro', uri=True)`
- context.db created on first run with schema migrations
- Git operations via `subprocess.run(['git', '-C', project_path, ...], capture_output=True)`

## Key Principle

`session_briefing()` is the anti-circle-coding tool. Every session in every tool calls it first.
The response replaces "explore codebase from scratch" with "here is everything that matters."
Single CHECKLIST.md in git = single source of truth. Never create a parallel checklist.
