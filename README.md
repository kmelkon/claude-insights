# claude-insights

Personal analytics dashboard for Claude Code. Reads your local `~/.claude/` data, optionally runs LLM analysis, and outputs a self-contained interactive HTML dashboard.

![Dashboard Preview](assets/dashboard-preview.png)

## What you get

- **Activity heatmap** — GitHub-style grid showing daily usage
- **Project breakdown** — sessions, messages, and timeline per project
- **Cost analytics** — token usage and cost by model with daily trends
- **Session explorer** — searchable/filterable table of all sessions
- **"At a Glance" narrative** — deeply personalized LLM-generated insights about your workflow patterns, what's working, what's not, and features to try

<details>
<summary>Full dashboard screenshot</summary>

![Full Dashboard](assets/dashboard.png)

</details>

## Prerequisites

- [Bun](https://bun.sh/) (or Node.js 20+)
- For LLM insights: either an **Anthropic API key** or **Google Cloud (Vertex AI)** access

## Installation

```bash
git clone https://github.com/kmelkon/claude-insights.git
cd claude-insights
npm install
```

## Usage

```bash
# Stats-only dashboard (no API calls needed)
bun run src/cli.ts --no-llm

# Full dashboard with LLM insights
bun run src/cli.ts

# Analyze only recent sessions
bun run src/cli.ts --max-sessions 50

# Filter to a specific project
bun run src/cli.ts --project mobile-app

# Last 7 days only
bun run src/cli.ts --days 7

# Custom output path
bun run src/cli.ts -o ~/Desktop/insights.html

# Re-analyze everything (clear cached facets)
bun run src/cli.ts --clear-cache
```

### CLI options

| Flag | Description | Default |
|---|---|---|
| `-o, --output <path>` | Output HTML file | `./claude-insights.html` |
| `--no-llm` | Skip LLM analysis | |
| `--project <name>` | Filter to a single project | |
| `--days <number>` | Limit to last N days | |
| `--max-sessions <number>` | Max sessions for LLM analysis | `200` |
| `--concurrency <number>` | Parallel LLM calls | `5` |
| `--clear-cache` | Re-analyze all sessions | |

## LLM provider setup

The tool auto-detects which provider to use based on environment variables. The `--no-llm` flag skips LLM analysis entirely — no API access needed for the stats dashboard.

### Option A: Anthropic API (recommended for most users)

Set your API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/). Requires a paid API plan — note that Claude Pro/Max subscriptions do **not** include API access; you need to add credit to your API account separately.

Uses `claude-sonnet-4-5-20250514` by default.

### Option B: Google Cloud (Vertex AI)

If no `ANTHROPIC_API_KEY` is set, the tool falls back to Vertex AI. Make sure you have:

```bash
gcloud auth application-default login
```

Set the region (defaults to `europe-west1`):

```bash
export VERTEX_REGION=us-central1
```

Uses `claude-opus-4-6` by default — update the model in `src/llm/client.ts` to match what's available on your GCP project.

## How it works

1. **Reads** `~/.claude/stats-cache.json`, `~/.claude/projects/*/sessions-index.json`, and session transcript JSONL files
2. **Computes** activity heatmaps, project breakdowns, cost analytics from token counts
3. **Extracts facets** (optional) — for each session, condenses the transcript and sends it to Claude to extract structured metadata (task type, complexity, outcome, user behaviors, anti-patterns)
4. **Synthesizes insights** — aggregates all facets and sends them to Claude to produce a personalized narrative assessment
5. **Renders** a single self-contained HTML file with inline CSS, JS, and Chart.js

### LLM pipeline

Facets are cached at `~/.claude-insights/facets/` so subsequent runs only analyze new sessions. The synthesis prompt receives enriched context including project names, task distributions, tool frequency, and behavioral patterns to produce deeply personalized insights rather than generic advice.

## Data sources

| File | Contents |
|---|---|
| `~/.claude/stats-cache.json` | Daily activity, model tokens, hourly distribution |
| `~/.claude/projects/*/sessions-index.json` | Per-project session metadata |
| `~/.claude/projects/*/*.jsonl` | Full session transcripts |
