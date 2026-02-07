import type { DashboardData } from "../types.js";
import { getStyles } from "./styles.js";
import { getScripts } from "./scripts.js";
import { renderHeatmap } from "./sections/heatmap.js";
import { renderProjects } from "./sections/projects.js";
import { renderCosts } from "./sections/costs.js";
import { renderSessions } from "./sections/sessions.js";
import { renderAtAGlance } from "./sections/at-a-glance.js";
import { renderStrengths } from "./sections/strengths.js";
import { renderImprovements } from "./sections/improvements.js";
import { renderFeatures } from "./sections/features.js";

export function renderHTML(data: DashboardData): string {
  const hasLLM = !!data.llm;
  const activity = data.activity;
  const costs = data.costs;

  // Overview hero cards
  const daysUsing = activity.totalDays;
  const totalSessions = activity.totalSessions;
  const totalMessages = activity.totalMessages;
  const totalCost = costs.totalCost;
  const peakDay = activity.peakDay;

  const overview = `
    <h2 class="section-title">Overview</h2>
    <div class="hero-grid">
      <div class="hero-card">
        <div class="hero-value">${daysUsing}</div>
        <div class="hero-label">Days Using Claude</div>
      </div>
      <div class="hero-card">
        <div class="hero-value">${fmt(totalSessions)}</div>
        <div class="hero-label">Total Sessions</div>
      </div>
      <div class="hero-card">
        <div class="hero-value">${fmt(totalMessages)}</div>
        <div class="hero-label">Total Messages</div>
      </div>
      <div class="hero-card">
        <div class="hero-value" style="color:#4ECB71">$${totalCost.toFixed(2)}</div>
        <div class="hero-label">Total Cost</div>
      </div>
      <div class="hero-card">
        <div class="hero-value" style="font-size:1.5rem">${peakDay.date ? fmtDate(peakDay.date) : "-"}</div>
        <div class="hero-label">Most Active Day (${peakDay.count} msgs)</div>
      </div>
    </div>`;

  // At a glance
  const atAGlanceHtml = renderAtAGlance(data);

  // Sidebar nav links
  const llmLinks = hasLLM
    ? `
    <a href="#glance">At a Glance</a>
    <a href="#impressive">Impressive Things</a>
    <a href="#wrong">Where Things Go Wrong</a>
    <a href="#features">Features to Try</a>`
    : "";

  // Section content
  const strengthsHtml = renderStrengths(data);
  const improvementsHtml = renderImprovements(data);
  const featuresHtml = renderFeatures(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <style>${getStyles()}</style>
</head>
<body>
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1>Claude Analytics</h1>
      <p class="subtitle">Personal Analytics</p>
    </div>
    <a href="#overview">Overview</a>
    ${llmLinks}
    <a href="#activity">Activity</a>
    <a href="#projects">Projects</a>
    <a href="#costs">Costs</a>
    <a href="#sessions">Sessions</a>
  </nav>
  <main>
    <section id="overview">${overview}</section>
    ${atAGlanceHtml ? `<section id="glance">${atAGlanceHtml}</section>` : ""}
    <section id="activity">${renderHeatmap(data)}</section>
    <section id="projects">${renderProjects(data)}</section>
    <section id="costs">${renderCosts(data)}</section>
    <section id="sessions">${renderSessions(data)}</section>
    ${strengthsHtml ? `<section id="impressive">${strengthsHtml}</section>` : ""}
    ${improvementsHtml ? `<section id="wrong">${improvementsHtml}</section>` : ""}
    ${featuresHtml ? `<section id="features">${featuresHtml}</section>` : ""}
  </main>
  <script>window.__data = ${JSON.stringify(data)};</script>
  <script>${getScripts()}</script>
</body>
</html>`;
}

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toString();
}

function fmtDate(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
