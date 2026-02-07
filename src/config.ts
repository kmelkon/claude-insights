import { homedir } from "os";
import { join } from "path";

const CLAUDE_DIR = join(homedir(), ".claude");

export const PATHS = {
  claudeDir: CLAUDE_DIR,
  statsCache: join(CLAUDE_DIR, "stats-cache.json"),
  history: join(CLAUDE_DIR, "history.jsonl"),
  projects: join(CLAUDE_DIR, "projects"),
  facetsDir: join(homedir(), ".claude-analytics", "facets"),
};

// Per 1M tokens (output tokens use same rate for simplicity where not split)
export const MODEL_PRICING: Record<
  string,
  { input: number; cacheRead: number; cacheWrite: number; output: number }
> = {
  "claude-opus-4-5-20251101": {
    input: 15,
    cacheRead: 1.5,
    cacheWrite: 18.75,
    output: 75,
  },
  "claude-opus-4-6": {
    input: 15,
    cacheRead: 1.5,
    cacheWrite: 18.75,
    output: 75,
  },
  "claude-sonnet-4-5-20250929": {
    input: 3,
    cacheRead: 0.3,
    cacheWrite: 3.75,
    output: 15,
  },
  "claude-sonnet-4-20250514": {
    input: 3,
    cacheRead: 0.3,
    cacheWrite: 3.75,
    output: 15,
  },
  "claude-3-5-haiku-20241022": {
    input: 0.8,
    cacheRead: 0.08,
    cacheWrite: 1,
    output: 4,
  },
};

export const DEFAULTS = {
  output: "./claude-analytics.html",
  concurrency: 5,
  maxSessions: 200,
};
