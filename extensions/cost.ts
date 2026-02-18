import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

interface CostEntry {
  cost: number;
  model: string;
  date: string;
}

function extractCosts(filePath: string): CostEntry[] {
  const entries: CostEntry[] = [];
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (
          entry.type === "message" &&
          entry.message?.role === "assistant" &&
          entry.message?.usage?.cost?.total
        ) {
          const date = path.basename(filePath).slice(0, 10);
          entries.push({
            cost: entry.message.usage.cost.total,
            model: entry.message.model ?? "unknown",
            date,
          });
        }
      } catch {}
    }
  } catch {}
  return entries;
}

function findJsonlFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    if (!fs.existsSync(dir)) return files;
    const walk = (d: string) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".jsonl")) files.push(full);
      }
    };
    walk(dir);
  } catch {}
  return files;
}

function getCutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("cost", {
    description: "Show API cost summary (default: 7 days). Usage: /cost [days]",
    handler: async (args, ctx) => {
      const days = args?.trim() ? parseInt(args.trim(), 10) : 7;
      if (isNaN(days) || days < 1) {
        ctx.ui.notify("Usage: /cost [days] — e.g. /cost 7", "error");
        return;
      }

      const cutoff = getCutoffDate(days);
      const sessionsDir = path.join(os.homedir(), ".pi", "agent", "sessions");
      const tmpDir = process.env.TMPDIR ?? "/tmp";

      // Collect main sessions
      const mainFiles = findJsonlFiles(sessionsDir);
      // Collect subagent sessions
      const subagentDirs: string[] = [];
      try {
        for (const entry of fs.readdirSync(tmpDir, { withFileTypes: true })) {
          if (
            entry.isDirectory() &&
            entry.name.startsWith("pi-subagent-session-")
          ) {
            subagentDirs.push(path.join(tmpDir, entry.name));
          }
        }
      } catch {}
      const subagentFiles = subagentDirs.flatMap(findJsonlFiles);

      // Process
      let mainCost = 0;
      let subagentCost = 0;
      let mainSessions = 0;
      let subagentSessions = 0;
      const byDate: Record<string, number> = {};
      const byModel: Record<string, number> = {};
      const byProject: Record<string, number> = {};

      const processFile = (
        filePath: string,
        isSubagent: boolean
      ) => {
        const basename = path.basename(filePath);
        const datePart = basename.slice(0, 10);
        if (datePart < cutoff) return;

        const entries = extractCosts(filePath);
        if (entries.length === 0) return;

        let sessionCost = 0;
        for (const e of entries) {
          sessionCost += e.cost;
          byDate[e.date] = (byDate[e.date] ?? 0) + e.cost;
          byModel[e.model] = (byModel[e.model] ?? 0) + e.cost;
        }

        if (isSubagent) {
          subagentCost += sessionCost;
          subagentSessions++;
        } else {
          mainCost += sessionCost;
          mainSessions++;
          // Extract project name
          const dirName = path.basename(path.dirname(filePath));
          let project = dirName
            .replace(/^--/, "")
            .replace(/--$/, "")
            .replace(/^Users-[^-]+-Projects-/, "")
            .replace(/^private-tmp-/, "tmp/");
          if (!project || project.startsWith("Users-")) project = "other";
          byProject[project] = (byProject[project] ?? 0) + sessionCost;
        }
      };

      for (const f of mainFiles) processFile(f, false);
      for (const f of subagentFiles) processFile(f, true);

      const total = mainCost + subagentCost;
      const totalSessions = mainSessions + subagentSessions;

      // Build output
      const lines: string[] = [];
      lines.push(`💰 Total: ${formatCost(total)}  (${totalSessions} sessions, last ${days} days)`);
      lines.push(`   Main: ${formatCost(mainCost)} (${mainSessions})  ·  Subagents: ${formatCost(subagentCost)} (${subagentSessions})`);
      lines.push("");

      // By date
      const dates = Object.keys(byDate).sort();
      if (dates.length > 0) {
        lines.push("📅 By date:");
        for (const d of dates) {
          const bar = "█".repeat(Math.max(1, Math.round((byDate[d] / total) * 30)));
          lines.push(`   ${d}  ${formatCost(byDate[d]).padStart(8)}  ${bar}`);
        }
        lines.push("");
      }

      // By project (top 10)
      const projects = Object.entries(byProject)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      if (projects.length > 0) {
        lines.push("📁 By project:");
        for (const [name, cost] of projects) {
          lines.push(`   ${name.padEnd(30)} ${formatCost(cost).padStart(8)}`);
        }
        lines.push("");
      }

      // By model
      const models = Object.entries(byModel).sort((a, b) => b[1] - a[1]);
      if (models.length > 0) {
        lines.push("🤖 By model:");
        for (const [name, cost] of models) {
          lines.push(`   ${name.padEnd(30)} ${formatCost(cost).padStart(8)}`);
        }
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
