/**
 * Agent Extension
 *
 * Loads AGENT.md and prepends it to the system prompt on every turn.
 *
 * Resolution order:
 * 1. .pi/AGENT.md in the current working directory (project-specific)
 * 2. AGENT.md in the pi-config package root (user default)
 *
 * Project-specific AGENT.md fully overrides the user default.
 *
 * AGENT.md can include YAML frontmatter to configure skills:
 * ---
 * skills:
 *   - commit
 *   - github
 * ---
 *
 * When skills are specified, only those skills appear in the system prompt.
 * When omitted, all skills are available (default behavior).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function parseFrontmatter(content: string): {
  skills: string[] | null;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { skills: null, body: content };

  try {
    const yaml = match[1];
    const skills: string[] = [];
    let inSkills = false;

    for (const line of yaml.split("\n")) {
      if (line.match(/^skills:\s*$/)) {
        inSkills = true;
      } else if (inSkills && line.match(/^\s+-\s+/)) {
        skills.push(line.replace(/^\s+-\s+/, "").trim());
      } else if (!line.match(/^\s/)) {
        inSkills = false;
      }
    }

    return { skills: skills.length > 0 ? skills : null, body: match[2] };
  } catch {
    return { skills: null, body: content };
  }
}

function filterSkills(
  systemPrompt: string,
  allowedSkills: string[]
): string {
  // Filter <available_skills> block to only include allowed skills
  return systemPrompt.replace(
    /<available_skills>([\s\S]*?)<\/available_skills>/,
    (fullMatch, inner) => {
      const filtered = inner.replace(
        /<skill>([\s\S]*?)<\/skill>/g,
        (skillBlock: string, skillInner: string) => {
          const nameMatch = skillInner.match(
            /<name>(.*?)<\/name>/
          );
          if (nameMatch && allowedSkills.includes(nameMatch[1].trim())) {
            return skillBlock;
          }
          return "";
        }
      );
      return `<available_skills>${filtered}</available_skills>`;
    }
  );
}

export default function agentExtension(pi: ExtensionAPI) {
  const defaultAgentPath = path.join(__dirname, "..", "AGENT.md");

  pi.on("before_agent_start", async (event) => {
    const projectAgentPath = path.join(process.cwd(), ".pi", "AGENT.md");

    let agentContent: string | null = null;

    try {
      if (fs.existsSync(projectAgentPath)) {
        agentContent = fs.readFileSync(projectAgentPath, "utf-8").trim();
      }
    } catch {}

    if (!agentContent) {
      try {
        if (fs.existsSync(defaultAgentPath)) {
          agentContent = fs.readFileSync(defaultAgentPath, "utf-8").trim();
        }
      } catch {}
    }

    if (!agentContent) return;

    const { skills, body } = parseFrontmatter(agentContent);

    let systemPrompt = body + "\n\n---\n\n" + event.systemPrompt;

    if (skills) {
      systemPrompt = filterSkills(systemPrompt, skills);
    }

    return { systemPrompt };
  });

  pi.on("session_start", async (_event, ctx) => {
    const projectAgentPath = path.join(process.cwd(), ".pi", "AGENT.md");
    if (ctx.hasUI) {
      ctx.ui.notify(
        fs.existsSync(projectAgentPath)
          ? "🤖 Project agent loaded"
          : "🤖 Agent loaded",
        "info"
      );
    }
  });
}
