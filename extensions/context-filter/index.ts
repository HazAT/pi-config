import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import picomatch from "picomatch";

interface ContextRules {
  exclusionPatterns: string[]; // original patterns for display
  exclusions: picomatch.Matcher[];
  inclusions: string[]; // resolved absolute paths
  inclusionPatterns: string[]; // original patterns for display
}

function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function parseContextFile(filePath: string, cwd: string): ContextRules {
  const rules: ContextRules = {
    exclusionPatterns: [],
    exclusions: [],
    inclusions: [],
    inclusionPatterns: [],
  };

  if (!existsSync(filePath)) return rules;

  const content = readFileSync(filePath, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("!")) {
      const raw = line.slice(1).trim();
      const pattern = expandTilde(raw);
      rules.exclusionPatterns.push(raw);
      rules.exclusions.push(picomatch(pattern, { dot: true }));
    } else if (line.startsWith("+")) {
      const raw = line.slice(1).trim();
      const rawPath = expandTilde(raw);
      rules.inclusionPatterns.push(raw);
      rules.inclusions.push(resolve(cwd, rawPath));
    }
  }

  return rules;
}

function isExcluded(filePath: string, matchers: picomatch.Matcher[]): boolean {
  return matchers.some((m) => m(filePath));
}

/**
 * Remove ## path sections from the "# Project Context" area of the system prompt.
 * Sections look like: ## /absolute/path/to/AGENTS.md\n\n<content>\n\n
 */
function filterContextSections(prompt: string, matchers: picomatch.Matcher[]): string {
  if (matchers.length === 0) return prompt;

  // Match sections: ## <path>\n\n<content up to next ## or end of Project Context>
  // The Project Context block starts with "# Project Context"
  const projectCtxStart = prompt.indexOf("# Project Context");
  if (projectCtxStart === -1) return prompt;

  // Find where Project Context ends (next top-level heading or skills section)
  const afterCtx = prompt.indexOf("\n\nThe following skills", projectCtxStart);
  const afterDate = prompt.indexOf("\nCurrent date and time:", projectCtxStart);

  let projectCtxEnd: number;
  if (afterCtx !== -1) {
    projectCtxEnd = afterCtx;
  } else if (afterDate !== -1) {
    projectCtxEnd = afterDate;
  } else {
    projectCtxEnd = prompt.length;
  }

  const before = prompt.slice(0, projectCtxStart);
  const contextBlock = prompt.slice(projectCtxStart, projectCtxEnd);
  const after = prompt.slice(projectCtxEnd);

  // Split context block into sections by ## headings
  const sectionRegex = /^## (.+)$/gm;
  const sections: { path: string; start: number; end: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(contextBlock)) !== null) {
    if (sections.length > 0) {
      sections[sections.length - 1].end = match.index;
    }
    sections.push({ path: match[1].trim(), start: match.index, end: contextBlock.length });
  }

  // Build filtered context block
  let filtered = contextBlock;
  // Process in reverse to preserve indices
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];
    if (isExcluded(section.path, matchers)) {
      filtered = filtered.slice(0, section.start) + filtered.slice(section.end);
    }
  }

  // If all sections were removed, remove the entire Project Context header too
  const hasAnySections = /^## /m.test(filtered);
  if (!hasAnySections) {
    return before.trimEnd() + after;
  }

  return before + filtered + after;
}

/**
 * Remove <skill> blocks whose <location> matches an exclusion pattern.
 */
function filterSkillBlocks(prompt: string, matchers: picomatch.Matcher[]): string {
  if (matchers.length === 0) return prompt;

  return prompt.replace(
    /  <skill>\n(?:.*\n)*?  <\/skill>/g,
    (block) => {
      const locMatch = block.match(/<location>([^<]+)<\/location>/);
      if (locMatch && isExcluded(locMatch[1], matchers)) {
        return "";
      }
      return block;
    }
  );
}

/**
 * Append included files to the system prompt in the Project Context section.
 */
function appendInclusions(
  prompt: string,
  inclusions: string[],
  notify: (msg: string) => void
): string {
  if (inclusions.length === 0) return prompt;

  let additions = "";
  for (const filePath of inclusions) {
    if (!existsSync(filePath)) {
      notify(`context-filter: missing inclusion file: ${filePath}`);
      continue;
    }
    try {
      const content = readFileSync(filePath, "utf-8");
      additions += `## ${filePath}\n\n${content}\n\n`;
    } catch (e) {
      notify(`context-filter: failed to read ${filePath}: ${e}`);
    }
  }

  if (!additions) return prompt;

  // Insert before skills section or date line
  const skillsIdx = prompt.indexOf("\n\nThe following skills");
  const dateIdx = prompt.indexOf("\nCurrent date and time:");
  const insertIdx = skillsIdx !== -1 ? skillsIdx : dateIdx !== -1 ? dateIdx : prompt.length;

  // Ensure there's a Project Context section
  const hasProjectCtx = prompt.includes("# Project Context");
  if (!hasProjectCtx) {
    additions = "\n\n# Project Context\n\nProject-specific instructions and guidelines:\n\n" + additions;
  }

  return prompt.slice(0, insertIdx) + additions + prompt.slice(insertIdx);
}

export default function (pi: ExtensionAPI) {
  let rules: ContextRules = { exclusions: [], inclusions: [] };
  let cwd = process.cwd();

  pi.on("session_start", async (_event, ctx) => {
    cwd = ctx.cwd;
    const contextPath = join(cwd, ".pi", ".context");
    rules = parseContextFile(contextPath, cwd);

    if (!ctx.hasUI) return;
    if (rules.exclusions.length === 0 && rules.inclusions.length === 0) return;

    // Show summary in footer status
    const parts: string[] = [];
    if (rules.exclusionPatterns.length > 0) {
      parts.push(`✕ ${rules.exclusionPatterns.length} excluded`);
    }
    if (rules.inclusionPatterns.length > 0) {
      parts.push(`✓ ${rules.inclusionPatterns.length} included`);
    }
    ctx.ui.setStatus("context-filter", `[.context] ${parts.join(", ")}`);

    // Show detailed widget above editor
    const lines: string[] = ["[Context Filter]"];
    for (const p of rules.exclusionPatterns) {
      lines.push(`  ✕ ${p}`);
    }
    for (const p of rules.inclusionPatterns) {
      lines.push(`  ✓ ${p}`);
    }
    ctx.ui.setWidget("context-filter", lines);

    // Auto-hide widget after 15 seconds, keep status
    setTimeout(() => {
      ctx.ui.setWidget("context-filter", undefined);
    }, 15_000);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (rules.exclusions.length === 0 && rules.inclusions.length === 0) return;

    let prompt = event.systemPrompt;

    // Apply exclusions
    prompt = filterContextSections(prompt, rules.exclusions);
    prompt = filterSkillBlocks(prompt, rules.exclusions);

    // Apply inclusions
    prompt = appendInclusions(prompt, rules.inclusions, (msg) => {
      if (ctx.hasUI) ctx.ui.notify(msg, "warning");
    });

    return { systemPrompt: prompt };
  });
}
