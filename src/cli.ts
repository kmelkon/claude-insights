#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { writeFileSync } from "fs";
import { resolve } from "path";

import { readStats } from "./readers/stats.js";
import { readSessions } from "./readers/sessions.js";
import { analyzeActivity } from "./analyzers/activity.js";
import { analyzeProjects } from "./analyzers/projects.js";
import { analyzeCosts } from "./analyzers/costs.js";
import { analyzeLLM } from "./analyzers/llm.js";
import { renderHTML } from "./renderer/html.js";
import { DEFAULTS } from "./config.js";
import type { DashboardData, SessionEntry } from "./types.js";

const num = (v: string) => parseInt(v, 10);

const program = new Command()
  .name("claude-analytics")
  .description("Personal Claude Code analytics dashboard")
  .option("-o, --output <path>", "Output HTML file", DEFAULTS.output)
  .option("--no-llm", "Skip LLM analysis")
  .option("--project <name>", "Filter to a single project")
  .option("--days <number>", "Limit to last N days", num)
  .option("--max-sessions <number>", "Max sessions for LLM analysis", num, DEFAULTS.maxSessions)
  .option("--clear-cache", "Clear LLM facet cache")
  .option("--concurrency <number>", "Parallel LLM calls", num, DEFAULTS.concurrency);

program.parse();
const opts = program.opts();

async function main() {
  const spinner = ora("Reading stats...").start();

  // 1. Read data
  const stats = readStats();
  const projectSessions = readSessions();

  spinner.text = "Analyzing activity...";

  // 2. Collect all sessions, apply filters
  let allSessions: SessionEntry[] = projectSessions.flatMap((ps) => ps.sessions);

  if (opts.project) {
    const filter = opts.project.toLowerCase();
    const filtered = projectSessions.filter(
      (ps) =>
        ps.projectPath.toLowerCase().includes(filter) ||
        ps.projectDirName.toLowerCase().includes(filter)
    );
    allSessions = filtered.flatMap((ps) => ps.sessions);
  }

  if (opts.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - opts.days);
    const cutoffStr = cutoff.toISOString();
    allSessions = allSessions.filter((s) => s.created >= cutoffStr);
  }

  // 3. Run analyzers
  const activity = analyzeActivity(stats);
  const projects = analyzeProjects(
    opts.project
      ? projectSessions.filter(
          (ps) =>
            ps.projectPath.toLowerCase().includes(opts.project.toLowerCase()) ||
            ps.projectDirName.toLowerCase().includes(opts.project.toLowerCase())
        )
      : projectSessions
  );
  const costs = analyzeCosts(stats);

  // 4. Build dashboard data
  const dashboardData: DashboardData = {
    generatedAt: new Date().toISOString(),
    activity,
    projects,
    costs,
    sessions: allSessions.sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    ),
  };

  // 5. LLM analysis (if enabled)
  if (opts.llm !== false) {
    spinner.text = "Analyzing sessions with LLM...";
    try {
      const { synthesis, facets } = await analyzeLLM(allSessions, {
        maxSessions: opts.maxSessions,
        concurrency: opts.concurrency,
        clearCache: !!opts.clearCache,
        projects,
        onProgress: (done, total) => {
          spinner.text = `Analyzing sessions... ${done}/${total}`;
        },
      });
      dashboardData.llm = synthesis;
      dashboardData.facets = facets;
    } catch (err) {
      spinner.warn("LLM analysis failed, continuing without it");
      console.error(chalk.dim(String(err)));
    }
  }

  // 6. Render HTML
  spinner.text = "Rendering dashboard...";
  const html = renderHTML(dashboardData);
  const outputPath = resolve(opts.output);
  writeFileSync(outputPath, html);

  spinner.succeed("Dashboard generated!");

  // 7. Summary
  console.log();
  console.log(chalk.bold("  Claude Analytics Dashboard"));
  console.log(chalk.dim("  ─────────────────────────"));
  console.log(`  ${chalk.cyan("Sessions:")}    ${allSessions.length}`);
  console.log(`  ${chalk.cyan("Projects:")}    ${projects.length}`);
  console.log(`  ${chalk.cyan("Messages:")}    ${activity.totalMessages.toLocaleString()}`);
  console.log(`  ${chalk.cyan("Total Cost:")}  ${chalk.green("$" + costs.totalCost.toFixed(2))}`);
  if (dashboardData.facets) {
    console.log(`  ${chalk.cyan("LLM Facets:")}  ${dashboardData.facets.length} sessions analyzed`);
  }
  console.log();
  console.log(`  ${chalk.bold("Output:")} ${chalk.underline(outputPath)}`);
  console.log();
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});
