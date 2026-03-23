import {
  DynamicBorder,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
  type ReadonlyFooterDataProvider,
  type Theme,
} from "@mariozechner/pi-coding-agent";
import type { Model } from "@mariozechner/pi-ai";
import {
  Container,
  Input,
  SelectList,
  Spacer,
  type SelectItem,
  Text,
  truncateToWidth,
  visibleWidth,
} from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import {
  WATCHDOG_STATUS_EVENT,
  STATUS_KEYS,
  type BadgeLevel,
  type StatusSnapshot,
  type WatchdogStatusPayload,
  buildStatusSnapshot,
  parseBadge,
  serializeBadge,
} from "./context-status";
import { spawnSync } from "node:child_process";

interface SessionSummaryRecord {
  version: 1;
  createdAt: string;
  sessionId: string;
  sessionFile?: string;
  cwd: string;
  model?: string;
  gitBranch?: string;
  changedFiles: string[];
  goal: string;
  keyDecisions: string[];
  activeAreas: string[];
  openThreads: string[];
  nextSteps: string[];
  markdown: string;
}

interface PaletteEntry extends SelectItem {
  actionId: string;
  group: string;
  unavailableReason?: string;
}

interface PaletteState {
  sessionCost: number;
  activeTool?: string;
  sessionState: "idle" | "working";
  watchdog?: WatchdogStatusPayload;
  lastContextLevel?: BadgeLevel;
  autoCompactArmed: boolean;
  autoCompactInFlight: boolean;
}

const SUMMARY_DIR = "session-summaries";
const LOCAL_MODEL_ID = "pi-local";
const PREFERRED_LOCAL_PROVIDERS = ["Llama Server", "LM Studio"] as const;
const SUMMARY_TIMEOUT_MS = 30_000;

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "session";
}

function getSummariesDir(ctx: ExtensionContext): string {
  return path.join(ctx.sessionManager.getSessionDir(), SUMMARY_DIR);
}

function getTranscriptBlocks(ctx: ExtensionContext, maxBlocks = 24): string[] {
  const branch = ctx.sessionManager.getBranch();
  const blocks: string[] = [];
  for (let i = branch.length - 1; i >= 0 && blocks.length < maxBlocks; i -= 1) {
    const entry = branch[i];
    if (entry.type !== "message") continue;
    const message = entry.message;
    if (message.role !== "user" && message.role !== "assistant") continue;
    if (!Array.isArray(message.content)) continue;
    const text = message.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join("\n");
    if (!text) continue;
    blocks.push(`${message.role.toUpperCase()}:\n${text}`);
  }
  return blocks.reverse();
}

function trimTranscript(text: string, maxChars = 8_000): string {
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars);
}

function extractLikelyFiles(text: string): string[] {
  const matches = text.match(/([A-Za-z0-9_./\\-]+\.[A-Za-z0-9_]+)/g) ?? [];
  return [...new Set(matches)].slice(0, 6);
}

function fallbackSummary(ctx: ExtensionContext): Omit<SessionSummaryRecord, "version" | "createdAt" | "sessionId" | "sessionFile" | "cwd" | "model" | "markdown"> {
  const transcript = getTranscriptBlocks(ctx, 18);
  const combined = transcript.join("\n\n");
  const goal = transcript
    .filter((block) => block.startsWith("USER:"))
    .slice(-1)[0]
    ?.replace(/^USER:\s*/u, "")
    .split("\n")
    .join(" ")
    .slice(0, 220) || "Continue the current session with the latest branch context.";

  const activeAreas = extractLikelyFiles(combined);
  const assistantLines = transcript
    .filter((block) => block.startsWith("ASSISTANT:"))
    .flatMap((block) => block.replace(/^ASSISTANT:\s*/u, "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);
  const userLines = transcript
    .filter((block) => block.startsWith("USER:"))
    .flatMap((block) => block.replace(/^USER:\s*/u, "").split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    changedFiles: [],
    goal,
    keyDecisions: assistantLines.slice(-3).map((line) => line.slice(0, 180)),
    activeAreas,
    openThreads: userLines.slice(-3).map((line) => line.slice(0, 180)),
    nextSteps: assistantLines.slice(-3).map((line) => line.slice(0, 180)),
  };
}

function buildSummaryMarkdown(summary: Omit<SessionSummaryRecord, "version" | "createdAt" | "sessionId" | "sessionFile" | "cwd" | "model" | "markdown">, meta: {
  createdAt: string;
  cwd: string;
  model?: string;
  gitBranch?: string;
}): string {
  const lines: string[] = [];
  lines.push("# Session Summary");
  lines.push("");
  lines.push(`Created: ${meta.createdAt}`);
  lines.push(`Directory: ${meta.cwd}`);
  if (meta.model) lines.push(`Model: ${meta.model}`);
  if (meta.gitBranch) lines.push(`Git branch: ${meta.gitBranch}`);
  lines.push("");
  lines.push("## Goal");
  lines.push(summary.goal);
  lines.push("");
  lines.push("## Changed Files");
  if (summary.changedFiles.length) {
    for (const item of summary.changedFiles) lines.push(`- ${item}`);
  } else {
    lines.push("- No tracked working-tree changes detected.");
  }
  lines.push("");
  lines.push("## Key Decisions");
  if (summary.keyDecisions.length) {
    for (const item of summary.keyDecisions) lines.push(`- ${item}`);
  } else {
    lines.push("- No key decisions captured yet.");
  }
  lines.push("");
  lines.push("## Active Areas");
  if (summary.activeAreas.length) {
    for (const item of summary.activeAreas) lines.push(`- ${item}`);
  } else {
    lines.push("- No active files or areas detected.");
  }
  lines.push("");
  lines.push("## Open Threads");
  if (summary.openThreads.length) {
    for (const item of summary.openThreads) lines.push(`- ${item}`);
  } else {
    lines.push("- No open threads captured.");
  }
  lines.push("");
  lines.push("## Next Steps");
  if (summary.nextSteps.length) {
    for (const item of summary.nextSteps) lines.push(`- ${item}`);
  } else {
    lines.push("- Continue from the latest branch state.");
  }
  return lines.join("\n");
}

function readGitState(cwd: string): { gitBranch?: string; changedFiles: string[] } {
  const branchResult = spawnSync("git", ["branch", "--show-current"], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  const gitBranch = branchResult.status === 0 ? branchResult.stdout.trim() || undefined : undefined;

  const statusResult = spawnSync("git", ["status", "--short"], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  const changedFiles = statusResult.status === 0
    ? [...new Set(
        statusResult.stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.slice(3).trim())
          .filter(Boolean),
      )].slice(0, 12)
    : [];

  return { gitBranch, changedFiles };
}

async function selectSummaryModel(ctx: ExtensionContext): Promise<Model<any> | undefined> {
  for (const provider of PREFERRED_LOCAL_PROVIDERS) {
    const local = ctx.modelRegistry.find(provider, LOCAL_MODEL_ID);
    if (!local) continue;
    const localKey = await ctx.modelRegistry.getApiKey(local);
    if (localKey !== undefined) return local;
  }
  return ctx.model;
}

async function generateStructuredSummary(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<Omit<SessionSummaryRecord, "version" | "createdAt" | "sessionId" | "sessionFile" | "cwd" | "model" | "markdown">> {
  const fallback = fallbackSummary(ctx);
  const gitState = readGitState(ctx.cwd);
  if (!fallback.activeAreas.length && gitState.changedFiles.length) {
    fallback.activeAreas = gitState.changedFiles.slice(0, 6);
  }
  fallback.changedFiles = gitState.changedFiles;
  const model = await selectSummaryModel(ctx);
  if (!model) return fallback;

  const transcript = trimTranscript(getTranscriptBlocks(ctx, 28).join("\n\n"));
  const prompt = [
    "Summarize this coding session into strict JSON.",
    "Return only JSON with keys: goal, keyDecisions, activeAreas, openThreads, nextSteps.",
    "Each list must contain 0-5 short strings.",
    "Focus on the current goal, important implementation decisions, active files or areas, unresolved threads, and next steps.",
    "",
    transcript,
  ].join("\n");

  try {
    const result = await pi.exec(
      "pi",
      [
        "-p",
        "--no-session",
        "--no-tools",
        "--provider",
        model.provider,
        "--model",
        model.id,
        prompt,
      ],
      { timeout: SUMMARY_TIMEOUT_MS },
    );

    if (result.code !== 0 || !result.stdout?.trim()) {
      return fallback;
    }

    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      changedFiles: gitState.changedFiles,
      goal: typeof parsed.goal === "string" && parsed.goal.trim() ? parsed.goal.trim() : fallback.goal,
      keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions.map(String).slice(0, 5) : fallback.keyDecisions,
      activeAreas: Array.isArray(parsed.activeAreas) && parsed.activeAreas.length
        ? parsed.activeAreas.map(String).slice(0, 5)
        : fallback.activeAreas,
      openThreads: Array.isArray(parsed.openThreads) ? parsed.openThreads.map(String).slice(0, 5) : fallback.openThreads,
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String).slice(0, 5) : fallback.nextSteps,
    };
  } catch {
    return fallback;
  }
}

async function writeSessionSummary(pi: ExtensionAPI, ctx: ExtensionContext): Promise<SessionSummaryRecord & { filePath: string }> {
  const summary = await generateStructuredSummary(pi, ctx);
  const createdAt = new Date().toISOString();
  const sessionId = ctx.sessionManager.getSessionId();
  const sessionFile = ctx.sessionManager.getSessionFile();
  const modelLabel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
  const gitState = readGitState(ctx.cwd);
  const markdown = buildSummaryMarkdown(summary, {
    createdAt,
    cwd: ctx.cwd,
    model: modelLabel,
    gitBranch: gitState.gitBranch,
  });
  const record: SessionSummaryRecord = {
    version: 1,
    createdAt,
    sessionId,
    sessionFile,
    cwd: ctx.cwd,
    model: modelLabel,
    gitBranch: gitState.gitBranch,
    changedFiles: summary.changedFiles,
    goal: summary.goal,
    keyDecisions: summary.keyDecisions,
    activeAreas: summary.activeAreas,
    openThreads: summary.openThreads,
    nextSteps: summary.nextSteps,
    markdown,
  };

  const summariesDir = getSummariesDir(ctx);
  await fsp.mkdir(summariesDir, { recursive: true });
  const fileName = `${createdAt.replace(/[:.]/g, "-")}_${sanitizeFilePart(sessionId)}.json`;
  const filePath = path.join(summariesDir, fileName);
  await fsp.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  return { ...record, filePath };
}

async function readSessionSummaries(ctx: ExtensionContext): Promise<Array<SessionSummaryRecord & { filePath: string }>> {
  const summariesDir = getSummariesDir(ctx);
  if (!fs.existsSync(summariesDir)) return [];
  const files = (await fsp.readdir(summariesDir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  const results: Array<SessionSummaryRecord & { filePath: string }> = [];
  for (const file of files) {
    try {
      const filePath = path.join(summariesDir, file);
      const parsed = JSON.parse(await fsp.readFile(filePath, "utf8")) as SessionSummaryRecord;
      results.push({ ...parsed, filePath });
    } catch {
      // Ignore malformed artifacts.
    }
  }
  return results;
}

function renderContextStatus(snapshot: StatusSnapshot): string {
  const lines = [
    `State: ${snapshot.state.text}`,
    `Model: ${snapshot.model.text}`,
    `Context: ${snapshot.context.text}`,
  ];
  if (snapshot.cost) lines.push(`Cost: ${snapshot.cost.text}`);
  if (snapshot.tool) lines.push(`Tool: ${snapshot.tool.text}`);
  if (snapshot.watchdog) lines.push(`Watchdog: ${snapshot.watchdog.text}`);
  return lines.join("\n");
}

class FooterBadgeLine {
  constructor(private theme: Theme, private footerData: ReadonlyFooterDataProvider) {}

  private style(level: BadgeLevel, text: string): string {
    if (level === "danger") return this.theme.fg("error", this.theme.bold(text));
    if (level === "warn") return this.theme.fg("warning", this.theme.bold(text));
    if (level === "ok") return this.theme.fg("success", text);
    return this.theme.fg("muted", text);
  }

  render(width: number): string[] {
    const statuses = this.footerData.getExtensionStatuses();
    const segments: Array<{ text: string }> = [];
    const branch = this.footerData.getGitBranch();
    if (branch) {
      segments.push({ text: this.theme.fg("accent", `git:${branch}`) });
    }

    const orderedKeys = [
      STATUS_KEYS.state,
      STATUS_KEYS.model,
      STATUS_KEYS.context,
      STATUS_KEYS.cost,
      STATUS_KEYS.tool,
      STATUS_KEYS.watchdog,
    ] as const;

    for (const key of orderedKeys) {
      const badge = parseBadge(statuses.get(key));
      if (!badge) continue;
      const prefix =
        key === STATUS_KEYS.context ? "ctx " :
        key === STATUS_KEYS.tool ? "tool " :
        "";
      segments.push({ text: this.style(badge.level, `${prefix}${badge.text}`) });
    }

    const divider = this.theme.fg("dim", " | ");
    let visible = [...segments];
    while (visible.length > 1) {
      const line = visible.map((segment) => segment.text).join(divider);
      if (visibleWidth(line) <= width) {
        return [line];
      }
      visible.pop();
    }

    if (!visible.length) return [""];
    return [truncateToWidth(visible[0].text, width)];
  }
}

class FooterComponent extends Container {
  private line: FooterBadgeLine;

  constructor(theme: Theme, footerData: ReadonlyFooterDataProvider) {
    super();
    this.line = new FooterBadgeLine(theme, footerData);
  }

  override render(width: number): string[] {
    return this.line.render(width);
  }
}

class SearchSelectComponent extends Container {
  private searchInput: Input;
  private selectList: SelectList;

  constructor(
    theme: Theme,
    title: string,
    items: SelectItem[],
    private onSelect: (item: SelectItem) => void,
    private onCancel: () => void,
  ) {
    super();
    this.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
    this.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
    this.addChild(new Spacer(1));

    this.searchInput = new Input();
    this.searchInput.onEscape = () => this.onCancel();
    this.searchInput.onSubmit = () => {
      const item = this.selectList.getSelectedItem();
      if (item) this.onSelect(item);
    };
    this.addChild(this.searchInput);
    this.addChild(new Spacer(1));

    this.selectList = new SelectList(items, 12, {
      selectedPrefix: (text: string) => theme.fg("accent", text),
      selectedText: (text: string) => theme.fg("accent", text),
      description: (text: string) => theme.fg("muted", text),
      scrollInfo: (text: string) => theme.fg("dim", text),
      noMatch: (text: string) => theme.fg("warning", text),
    });
    this.selectList.onSelect = (item) => this.onSelect(item);
    this.selectList.onCancel = this.onCancel;
    this.addChild(this.selectList);
    this.addChild(new Spacer(1));
    this.addChild(new Text(theme.fg("dim", "Type to filter. Enter selects. Esc closes."), 1, 0));
    this.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
  }

  override handleInput(data: string): void {
    if (data === "\n" || data === "\r") {
      this.searchInput.handleInput(data);
      return;
    }

    if (data === "\u001b") {
      this.onCancel();
      return;
    }

    if (data.startsWith("\u001b[") || data.startsWith("\u001bO")) {
      this.selectList.handleInput(data);
      return;
    }

    this.searchInput.handleInput(data);
    this.selectList.setFilter(this.searchInput.getValue());
  }
}

class ToolPickerComponent extends Container {
  private selectList: SelectList;
  private items: Array<SelectItem & { selected: boolean }>;
  private readonly footerText: Text;

  constructor(
    theme: Theme,
    toolItems: Array<SelectItem & { selected: boolean }>,
    private onDone: (selectedNames: string[] | null) => void,
  ) {
    super();
    this.items = toolItems;
    this.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
    this.addChild(new Text(theme.fg("accent", theme.bold("Tool Picker")), 1, 0));
    this.addChild(new Spacer(1));
    this.selectList = this.buildList(theme);
    this.addChild(this.selectList);
    this.addChild(new Spacer(1));
    this.footerText = new Text(theme.fg("dim", "Enter toggles. Ctrl+S saves. Esc cancels."), 1, 0);
    this.addChild(this.footerText);
    this.addChild(new DynamicBorder((text: string) => theme.fg("accent", text)));
  }

  private buildList(theme: Theme): SelectList {
    const list = new SelectList(
      this.items.map((item) => ({
        value: item.value,
        label: `${item.selected ? "[x]" : "[ ]"} ${item.label}`,
        description: item.description,
      })),
      12,
      {
        selectedPrefix: (text: string) => theme.fg("accent", text),
        selectedText: (text: string) => theme.fg("accent", text),
        description: (text: string) => theme.fg("muted", text),
        scrollInfo: (text: string) => theme.fg("dim", text),
        noMatch: (text: string) => theme.fg("warning", text),
      },
    );
    list.onSelect = (item) => {
      const found = this.items.find((candidate) => candidate.value === item.value);
      if (found) {
        found.selected = !found.selected;
        const previous = this.selectList;
        this.selectList = this.buildList(theme);
        this.removeChild(previous);
        this.children.splice(3, 0, this.selectList);
        this.invalidate();
      }
    };
    list.onCancel = () => this.onDone(null);
    return list;
  }

  override handleInput(data: string): void {
    if (data === "\u0013") {
      this.onDone(this.items.filter((item) => item.selected).map((item) => item.value));
      return;
    }
    this.selectList.handleInput(data);
  }
}

function makePaletteEntries(commands: Set<string>, codexAvailable: boolean): PaletteEntry[] {
  const entries: PaletteEntry[] = [
    {
      actionId: "workflow.plan",
      group: "workflow",
      value: "workflow.plan",
      label: "Plan",
      description: "Start a /plan workflow",
      unavailableReason: commands.has("plan") ? undefined : "Missing /plan command",
    },
    {
      actionId: "workflow.scout",
      group: "workflow",
      value: "workflow.scout",
      label: "Scout",
      description: "Launch scout in a subagent",
      unavailableReason: commands.has("subagent") ? undefined : "Missing /subagent command",
    },
    {
      actionId: "workflow.review",
      group: "workflow",
      value: "workflow.review",
      label: "Review",
      description: "Launch reviewer in a subagent",
      unavailableReason: commands.has("subagent") ? undefined : "Missing /subagent command",
    },
    {
      actionId: "workflow.research",
      group: "workflow",
      value: "workflow.research",
      label: "Research",
      description: "Launch researcher in a subagent",
      unavailableReason: commands.has("subagent") ? undefined : "Missing /subagent command",
    },
    {
      actionId: "workflow.todo",
      group: "workflow",
      value: "workflow.todo",
      label: "Work On Todo",
      description: "Open the todo workflow",
    },
    {
      actionId: "session.status",
      group: "session",
      value: "session.status",
      label: "Context Status",
      description: "Show current context and footer state",
    },
    {
      actionId: "session.compact",
      group: "session",
      value: "session.compact",
      label: "Compact Now",
      description: "Trigger manual compaction",
    },
    {
      actionId: "session.summarize",
      group: "session",
      value: "session.summarize",
      label: "Summarize Session",
      description: "Write a reusable session summary artifact",
    },
    {
      actionId: "session.summaries",
      group: "session",
      value: "session.summaries",
      label: "Recent Summaries",
      description: "Pick a saved session summary and paste it into the editor",
    },
    {
      actionId: "session.watchdog",
      group: "session",
      value: "session.watchdog",
      label: "Toggle Watchdog",
      description: "Run /watchdog",
    },
    {
      actionId: "command.answer",
      group: "command",
      value: "command.answer",
      label: "Answer",
      description: "Run /answer",
    },
    {
      actionId: "command.todos",
      group: "command",
      value: "command.todos",
      label: "Todos",
      description: "Run /todos",
    },
    {
      actionId: "command.cost",
      group: "command",
      value: "command.cost",
      label: "Cost",
      description: "Run /cost",
    },
    {
      actionId: "tools.pick",
      group: "tool",
      value: "tools.pick",
      label: "Tool Picker",
      description: "Choose which tools are active",
    },
  ];

  const agentEntries = [
    ["agent.worker", "worker", "Launch worker"],
    ["agent.python", "python-worker", "Launch Python worker"],
    ["agent.dotnet", "dotnet-worker", "Launch .NET worker"],
    ["agent.docker", "docker-worker", "Launch Docker worker"],
    ["agent.env", "env-doctor", "Launch environment doctor"],
    ["agent.planner", "planner", "Launch planner"],
    ["agent.reviewer", "reviewer", "Launch reviewer"],
    ["agent.researcher", "researcher", "Launch researcher"],
    ["agent.scout", "scout", "Launch scout"],
    ["agent.plannerCodex", "planner-codex", "Launch Codex planner"],
    ["agent.reviewerCodex", "reviewer-codex", "Launch Codex reviewer"],
    ["agent.researcherCodex", "researcher-codex", "Launch Codex researcher"],
  ] as const;

  for (const [actionId, agentName, description] of agentEntries) {
    const unavailableReason =
      agentName.toLowerCase().includes("codex")
        ? codexAvailable ? undefined : "Codex model unavailable"
        : commands.has("subagent") ? undefined : "Missing /subagent command";
    entries.push({
      actionId,
      group: "agent",
      value: actionId,
      label: agentName,
      description,
      unavailableReason,
    });
  }

  return entries.map((entry) => ({
    ...entry,
    label: entry.unavailableReason ? `${entry.label} [unavailable]` : entry.label,
    description: entry.unavailableReason ?? entry.description,
  }));
}

async function showSearchPicker(
  ctx: ExtensionContext,
  title: string,
  items: SelectItem[],
): Promise<SelectItem | null> {
  return ctx.ui.custom<SelectItem | null>((_tui, theme, _keybindings, done) => {
    return new SearchSelectComponent(theme, title, items, (item) => done(item), () => done(null));
  }, {
    overlay: true,
    overlayOptions: { width: "70%", maxHeight: "80%", anchor: "center" },
  });
}

async function showToolPicker(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  const active = new Set(pi.getActiveTools());
  const allTools = pi.getAllTools()
    .filter((tool) => tool.name !== "execute_command")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((tool) => ({
      value: tool.name,
      label: tool.name,
      description: tool.description,
      selected: active.has(tool.name),
    }));

  const selected = await ctx.ui.custom<string[] | null>((_tui, theme, _kb, done) => {
    return new ToolPickerComponent(theme, allTools, done);
  }, {
    overlay: true,
    overlayOptions: { width: "70%", maxHeight: "80%", anchor: "center" },
  });

  if (!selected) return;
  pi.setActiveTools(selected);
  ctx.ui.notify(`Active tools: ${selected.join(", ") || "(none)"}`, "info");
}

async function pasteRecentSummary(ctx: ExtensionContext): Promise<boolean> {
  const summaries = await readSessionSummaries(ctx);
  if (!summaries.length) {
    ctx.ui.notify("No session summaries yet. Run /context summarize first.", "warning");
    return false;
  }

  const choice = await showSearchPicker(
    ctx,
    "Recent Summaries",
    summaries.slice(0, 20).map((summary) => ({
      value: summary.filePath,
      label: summary.goal.slice(0, 80),
      description: `${summary.createdAt} - ${path.basename(summary.filePath)}`,
    })),
  );
  if (!choice) return false;

  const selected = summaries.find((summary) => summary.filePath === choice.value);
  if (!selected) return false;
  ctx.ui.pasteToEditor(`Session summary:\n\n${selected.markdown}\n\n`);
  return true;
}

function buildAgentCommand(agentName: string, task: string): string {
  return `/subagent ${agentName} ${task}`;
}

async function runPaletteAction(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  entry: PaletteEntry,
  state: PaletteState,
): Promise<void> {
  if (entry.unavailableReason) {
    ctx.ui.notify(entry.unavailableReason, "warning");
    return;
  }

  switch (entry.actionId) {
    case "workflow.plan": {
      const task = await ctx.ui.input("Plan task", "What should we plan?");
      if (task?.trim()) pi.sendUserMessage(`/plan ${task.trim()}`);
      return;
    }
    case "workflow.scout":
    case "workflow.review":
    case "workflow.research":
    case "agent.worker":
    case "agent.python":
    case "agent.dotnet":
    case "agent.docker":
    case "agent.env":
    case "agent.planner":
    case "agent.reviewer":
    case "agent.researcher":
    case "agent.scout":
    case "agent.plannerCodex":
    case "agent.reviewerCodex":
    case "agent.researcherCodex": {
      const agentName =
        entry.actionId === "workflow.scout" ? "scout" :
        entry.actionId === "workflow.review" ? "reviewer" :
        entry.actionId === "workflow.research" ? "researcher" :
        entry.label.replace(" [unavailable]", "");
      const task = await ctx.ui.input(`Task for ${agentName}`, "What should this agent do?");
      if (task?.trim()) {
        pi.sendUserMessage(buildAgentCommand(agentName, task.trim()));
      }
      return;
    }
    case "workflow.todo":
      pi.sendUserMessage("/todos");
      return;
    case "session.status":
      ctx.ui.notify(renderContextStatus(buildStatusSnapshot({
        model: ctx.model,
        usage: ctx.getContextUsage(),
        sessionCost: state.sessionCost,
        activeTool: state.activeTool,
        watchdog: state.watchdog,
        state: state.sessionState,
      })), "info");
      return;
    case "session.compact":
      ctx.compact();
      ctx.ui.notify("Compaction started.", "info");
      return;
    case "session.summarize": {
      await ctx.waitForIdle();
      const record = await writeSessionSummary(pi, ctx);
      ctx.ui.notify(`Saved summary: ${path.basename(record.filePath)}`, "info");
      return;
    }
    case "session.summaries":
      await pasteRecentSummary(ctx);
      return;
    case "session.watchdog":
      pi.sendUserMessage("/watchdog");
      return;
    case "command.answer":
      pi.sendUserMessage("/answer");
      return;
    case "command.todos":
      pi.sendUserMessage("/todos");
      return;
    case "command.cost":
      pi.sendUserMessage("/cost");
      return;
    case "tools.pick":
      await showToolPicker(pi, ctx);
      return;
    default:
      ctx.ui.notify(`Unhandled hub action: ${entry.actionId}`, "warning");
  }
}

function contextBand(percent: number | null): BadgeLevel {
  if (percent == null) return "muted";
  if (percent >= 85) return "danger";
  if (percent >= 70) return "warn";
  return "ok";
}

function updateFooterStatuses(ctx: ExtensionContext, snapshot: StatusSnapshot): void {
  ctx.ui.setStatus(STATUS_KEYS.state, serializeBadge(snapshot.state));
  ctx.ui.setStatus(STATUS_KEYS.model, serializeBadge(snapshot.model));
  ctx.ui.setStatus(STATUS_KEYS.context, serializeBadge(snapshot.context));
  ctx.ui.setStatus(STATUS_KEYS.cost, serializeBadge(snapshot.cost));
  ctx.ui.setStatus(STATUS_KEYS.tool, serializeBadge(snapshot.tool));
  ctx.ui.setStatus(STATUS_KEYS.watchdog, serializeBadge(snapshot.watchdog));
}

export default function (pi: ExtensionAPI) {
  const state: PaletteState = {
    sessionCost: 0,
    sessionState: "idle",
    autoCompactArmed: true,
    autoCompactInFlight: false,
  };
  let sessionCtx: ExtensionContext | null = null;

  function rebuildCostFromBranch(ctx: ExtensionContext): void {
    state.sessionCost = 0;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (
        entry.type === "message" &&
        entry.message.role === "assistant" &&
        (entry.message as any).usage?.cost?.total
      ) {
        state.sessionCost += (entry.message as any).usage.cost.total;
      }
    }
  }

  function refreshSnapshot(ctx: ExtensionContext): StatusSnapshot {
    const snapshot = buildStatusSnapshot({
      model: ctx.model,
      usage: ctx.getContextUsage(),
      sessionCost: state.sessionCost,
      activeTool: state.activeTool,
      watchdog: state.watchdog,
      state: state.sessionState,
    });
    if (ctx.hasUI) {
      updateFooterStatuses(ctx, snapshot);
    }
    return snapshot;
  }

  function maybeAutoCompact(ctx: ExtensionContext, snapshot: StatusSnapshot): void {
    const band = contextBand(snapshot.contextPercent);
    const previousBand = state.lastContextLevel;
    state.lastContextLevel = band;

    if (snapshot.contextPercent != null && snapshot.contextPercent < 70) {
      state.autoCompactArmed = true;
    }

    if (band === "warn" && previousBand !== "warn" && previousBand !== "danger" && ctx.hasUI) {
      ctx.ui.notify(`Context warning: ${snapshot.context.text}. Use /context compact if needed.`, "warning");
    }

    if (
      band === "danger" &&
      snapshot.contextWindow != null &&
      state.autoCompactArmed &&
      !state.autoCompactInFlight
    ) {
      state.autoCompactArmed = false;
      state.autoCompactInFlight = true;
      if (ctx.hasUI) {
        ctx.ui.notify(`Context danger: ${snapshot.context.text}. Auto-compacting now.`, "warning");
      }
      ctx.compact({
        onComplete: () => {
          state.autoCompactInFlight = false;
        },
        onError: (error) => {
          state.autoCompactInFlight = false;
          if (ctx.hasUI) {
            ctx.ui.notify(`Auto-compaction failed: ${error.message}`, "error");
          }
        },
      });
    }
  }

  async function runContextCommand(args: string | undefined, ctx: ExtensionCommandContext): Promise<string | void> {
    const [actionRaw] = (args ?? "").trim().split(/\s+/, 1);
    const action = (actionRaw || "status").toLowerCase();
    const snapshot = refreshSnapshot(ctx);

    if (action === "status") {
      return renderContextStatus(snapshot);
    }

    if (action === "compact") {
      ctx.compact();
      return "Compaction started.";
    }

    if (action === "summarize") {
      await ctx.waitForIdle();
      const record = await writeSessionSummary(pi, ctx);
      return `Saved summary: ${record.filePath}`;
    }

    if (action === "list") {
      const summaries = await readSessionSummaries(ctx);
      if (!summaries.length) return "No session summaries found.";
      if (ctx.hasUI) {
        const pasted = await pasteRecentSummary(ctx);
        return pasted ? "Pasted selected summary into the editor." : "Summary picker closed.";
      }
      return summaries
        .slice(0, 10)
        .map((summary) => `${summary.createdAt}  ${summary.goal}  ${summary.filePath}`)
        .join("\n");
    }

    return "Usage: /context [status|compact|summarize|list]";
  }

async function openHub(ctx: ExtensionCommandContext): Promise<string | void> {
  if (!ctx.hasUI) {
    return "hub requires interactive mode";
  }

    const availableModels = ctx.modelRegistry.getAvailable();
    const codexAvailable = availableModels.some((model) =>
      model.provider === "openai-codex" ||
      `${model.provider}/${model.id}` === "openai-codex/gpt-5.4"
    );
    const commands = new Set(pi.getCommands().map((command) => command.name));
    const entries = makePaletteEntries(commands, codexAvailable);
    const choice = await ctx.ui.custom<PaletteEntry | null>((_tui, theme, _kb, done) => {
      return new SearchSelectComponent(
        theme,
        "Pi Hub",
        entries.map((entry) => ({
          value: entry.value,
          label: `[${entry.group}] ${entry.label}`,
          description: entry.description,
        })),
        (item) => {
          const found = entries.find((entry) => entry.value === item.value) ?? null;
          done(found);
        },
        () => done(null),
      );
    }, {
      overlay: true,
      overlayOptions: { width: "75%", maxHeight: "85%", anchor: "center" },
    });

  if (!choice) return;
  await runPaletteAction(pi, ctx, choice, state);
}

  pi.on("session_start", async (_event, ctx) => {
    sessionCtx = ctx;
    rebuildCostFromBranch(ctx);
    state.activeTool = undefined;
    state.sessionState = "idle";
    state.watchdog = undefined;
    state.autoCompactArmed = true;
    state.autoCompactInFlight = false;
    if (ctx.hasUI) {
      ctx.ui.setFooter((_tui, theme, footerData) => new FooterComponent(theme, footerData));
    }
    const snapshot = refreshSnapshot(ctx);
    maybeAutoCompact(ctx, snapshot);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    sessionCtx = null;
    state.activeTool = undefined;
    state.watchdog = undefined;
    if (ctx.hasUI) {
      ctx.ui.setStatus(STATUS_KEYS.state, undefined);
      ctx.ui.setStatus(STATUS_KEYS.model, undefined);
      ctx.ui.setStatus(STATUS_KEYS.context, undefined);
      ctx.ui.setStatus(STATUS_KEYS.cost, undefined);
      ctx.ui.setStatus(STATUS_KEYS.tool, undefined);
      ctx.ui.setStatus(STATUS_KEYS.watchdog, undefined);
      ctx.ui.setFooter(undefined);
    }
  });

  pi.on("agent_start", async (_event, ctx) => {
    state.sessionState = "working";
    refreshSnapshot(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    state.sessionState = "idle";
    refreshSnapshot(ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    const snapshot = refreshSnapshot(ctx);
    maybeAutoCompact(ctx, snapshot);
  });

  pi.on("turn_end", async (event, ctx) => {
    const message = event.message;
    if (message?.role === "assistant" && (message as any).usage?.cost?.total) {
      state.sessionCost += (message as any).usage.cost.total;
    }
    const snapshot = refreshSnapshot(ctx);
    maybeAutoCompact(ctx, snapshot);
  });

  pi.on("session_compact", async (_event, ctx) => {
    state.autoCompactInFlight = false;
    state.lastContextLevel = "muted";
    refreshSnapshot(ctx);
  });

  pi.on("tool_execution_start", async (event, ctx) => {
    state.activeTool = event.toolName;
    refreshSnapshot(ctx);
  });

  pi.on("tool_execution_end", async (_event, ctx) => {
    state.activeTool = undefined;
    refreshSnapshot(ctx);
  });

  pi.events.on(WATCHDOG_STATUS_EVENT, (payload: WatchdogStatusPayload) => {
    state.watchdog = payload;
    if (sessionCtx) {
      refreshSnapshot(sessionCtx);
    }
  });

  pi.registerCommand("context", {
    description: "Session health controls: /context [status|compact|summarize|list]",
    handler: (args, ctx) => runContextCommand(args, ctx),
  });

  pi.registerCommand("hub", {
    description: "Open the Pi command palette",
    handler: (_args, ctx) => openHub(ctx),
  });

  pi.registerShortcut("ctrl+k", {
    description: "Open the Pi command palette",
    handler: (ctx) => openHub(ctx as ExtensionCommandContext),
  });
}
