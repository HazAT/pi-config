import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const GLOBAL_MEMORY_PATH = path.join(os.homedir(), ".pi", "memory.md");
const PROJECT_MEMORY_FILE = ".pi/memory.md";

function getProjectMemoryPath(cwd: string): string {
  return path.join(cwd, PROJECT_MEMORY_FILE);
}

function readMemoryFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

function ensureMemoryFile(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    const isGlobal = filePath === GLOBAL_MEMORY_PATH;
    const header = isGlobal
      ? `# Pi Global Memory

This file contains facts and learnings about your machine and preferences.
Pi reads this at the start of every session.

## Environment

## Tools

## Preferences

## Gotchas
`
      : `# Pi Project Memory

This file contains facts and learnings specific to this project.
Pi reads this at the start of every session in this directory.

## Project

## Environment

## Gotchas
`;
    fs.writeFileSync(filePath, header, "utf-8");
  }
}

function appendToMemory(filePath: string, category: string, entry: string): void {
  ensureMemoryFile(filePath);
  
  let content = fs.readFileSync(filePath, "utf-8");
  const categoryHeader = `## ${category}`;
  
  const timestamp = new Date().toISOString().split("T")[0];
  const formattedEntry = `- ${entry} _(${timestamp})_\n`;
  
  if (content.includes(categoryHeader)) {
    // Append after the category header
    const insertPos = content.indexOf(categoryHeader) + categoryHeader.length;
    const nextSection = content.indexOf("\n## ", insertPos);
    
    if (nextSection === -1) {
      // Last section, append at end
      content = content.trimEnd() + "\n" + formattedEntry;
    } else {
      // Insert before next section
      const sectionEnd = content.lastIndexOf("\n", nextSection - 1);
      content = content.slice(0, sectionEnd + 1) + formattedEntry + content.slice(sectionEnd + 1);
    }
  } else {
    // Add new category at end
    content = content.trimEnd() + `\n\n${categoryHeader}\n\n${formattedEntry}`;
  }
  
  fs.writeFileSync(filePath, content, "utf-8");
}

export default function (pi: ExtensionAPI) {
  let globalMemory: string | null = null;
  let projectMemory: string | null = null;
  let projectMemoryPath: string = "";

  // Load memories at session start
  pi.on("session_start", async (_event, ctx) => {
    globalMemory = readMemoryFile(GLOBAL_MEMORY_PATH);
    projectMemoryPath = getProjectMemoryPath(ctx.cwd);
    projectMemory = readMemoryFile(projectMemoryPath);

    // Show notification if memories loaded
    if (ctx.hasUI) {
      const loaded: string[] = [];
      if (globalMemory) loaded.push("global");
      if (projectMemory) loaded.push("project");
      
      if (loaded.length > 0) {
        ctx.ui.notify(`📝 Memory loaded: ${loaded.join(" + ")}`, "info");
      }
    }
  });

  // Inject memories into context before agent starts
  pi.on("before_agent_start", async (event, ctx) => {
    const memories: string[] = [];
    
    if (globalMemory) {
      memories.push(`=== GLOBAL MEMORY (${GLOBAL_MEMORY_PATH}) ===\n${globalMemory}`);
    }
    
    if (projectMemory) {
      memories.push(`=== PROJECT MEMORY (${projectMemoryPath}) ===\n${projectMemory}`);
    }
    
    if (memories.length > 0) {
      return {
        message: {
          customType: "pi-memory",
          content: memories.join("\n\n"),
          display: false, // Don't clutter the UI, it's context for the LLM
        },
      };
    }
  });

  // Register the remember tool
  pi.registerTool({
    name: "remember",
    label: "Remember",
    description: `Save a fact or learning to pi's memory. Use this when you discover something important about:
- The environment (OS, shell, installed tools)
- Project-specific quirks or conventions
- User preferences
- Gotchas or things to watch out for

This is for FACTS, not behaviors. For new behaviors/capabilities, create a skill instead.

Scope:
- "global" = facts about the user's machine/preferences (saved to ~/.pi/memory.md)
- "project" = facts about this specific codebase (saved to .pi/memory.md)`,
    parameters: Type.Object({
      scope: StringEnum(["global", "project"] as const, {
        description: "Where to save: 'global' for machine/user facts, 'project' for codebase facts",
      }),
      category: Type.String({
        description: "Category like 'Environment', 'Tools', 'Preferences', 'Gotchas', 'Project'",
      }),
      entry: Type.String({
        description: "The fact to remember (be concise but clear)",
      }),
    }),

    async execute(toolCallId, params, onUpdate, ctx, signal) {
      const filePath = params.scope === "global" ? GLOBAL_MEMORY_PATH : getProjectMemoryPath(ctx.cwd);
      
      try {
        appendToMemory(filePath, params.category, params.entry);
        
        // Reload the memory we just updated
        if (params.scope === "global") {
          globalMemory = readMemoryFile(GLOBAL_MEMORY_PATH);
        } else {
          projectMemory = readMemoryFile(filePath);
        }

        return {
          content: [{ type: "text", text: `✓ Remembered in ${params.scope} memory under "${params.category}":\n${params.entry}` }],
          details: { 
            scope: params.scope,
            category: params.category,
            entry: params.entry,
            file: filePath,
          },
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Failed to save memory: ${e}` }],
          details: { error: String(e) },
          isError: true,
        };
      }
    },
  });

  // Command to view memories
  pi.registerCommand("memory", {
    description: "View current memories (global and project)",
    handler: async (args, ctx) => {
      const global = readMemoryFile(GLOBAL_MEMORY_PATH);
      const project = readMemoryFile(getProjectMemoryPath(ctx.cwd));
      
      let output = "";
      if (global) {
        output += `📝 Global Memory (${GLOBAL_MEMORY_PATH}):\n${global}\n\n`;
      } else {
        output += `📝 No global memory found\n\n`;
      }
      
      if (project) {
        output += `📁 Project Memory (${getProjectMemoryPath(ctx.cwd)}):\n${project}`;
      } else {
        output += `📁 No project memory found`;
      }
      
      ctx.ui.notify(output, "info");
    },
  });
}
