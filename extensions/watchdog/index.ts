import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  STATUS_KEYS,
  WATCHDOG_STATUS_EVENT,
  buildWatchdogBadge,
  serializeBadge,
  type WatchdogStatusPayload,
} from "../context-status";

interface JudgeResult {
  action: "continue" | "nudge" | "abort";
  message: string;
  available: boolean;
}

function formatSessionSummary(ctx: any): string {
  const entries: any[] = ctx.sessionManager.getBranch();
  const recent = entries.slice(-20);
  const lines: string[] = [];
  let totalChars = 0;
  const cap = 4_000;

  const usage = ctx.getContextUsage?.();
  if (usage?.tokens != null) {
    lines.push(`[CONTEXT] ${usage.tokens} tokens used`);
  }

  for (const entry of recent) {
    if (totalChars >= cap) break;
    if (entry.type !== "message" || !entry.message) continue;

    const msg = entry.message;
    const ts = entry.timestamp
      ? new Date(entry.timestamp).toISOString().substring(11, 19)
      : "";
    const prefix = ts ? `[${ts}] ` : "";
    let line = "";

    if (msg.role === "user") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((block: any) => block.text ?? "").join(" ")
            : "";
      line = `${prefix}[USER] ${text.substring(0, 200)}`;
    } else if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (totalChars >= cap) break;
        if (block.type === "text") {
          line = `${prefix}[ASSISTANT] ${block.text.substring(0, 200)}`;
        } else if (block.type === "toolCall") {
          const args = JSON.stringify(block.arguments ?? {});
          line = `${prefix}[TOOL_CALL] ${block.name}(${args.substring(0, 100)})`;
        }
        if (line) {
          lines.push(line);
          totalChars += line.length;
          line = "";
        }
      }
      continue;
    } else if (msg.role === "toolResult") {
      const content = Array.isArray(msg.content)
        ? msg.content.map((block: any) => block.text ?? "").join(" ")
        : String(msg.content ?? "");
      const status = msg.isError ? "error" : "success";
      line = `${prefix}[TOOL_RESULT] ${msg.toolName ?? ""}: ${status} - ${content.substring(0, 200)}`;
    }

    if (line) {
      lines.push(line);
      totalChars += line.length;
    }
  }

  return lines.join("\n");
}

function buildDeterministicDecision(
  ctx: any,
  timeSinceActivityMs: number,
  stuckThresholdMs: number,
): { action: "nudge" | "abort"; message: string } {
  const idleSecs = Math.round(timeSinceActivityMs / 1_000);
  const usage = ctx.getContextUsage?.();
  const percent = usage?.percent ?? null;

  if (percent != null && percent >= 85) {
    return {
      action: "abort",
      message: `Context pressure is high (${Math.round(percent)}%) and the agent has been idle for ${idleSecs}s.`,
    };
  }

  if (timeSinceActivityMs >= stuckThresholdMs * 2) {
    return {
      action: "abort",
      message: `The agent has been idle for ${idleSecs}s without progress.`,
    };
  }

  return {
    action: "nudge",
    message: `The agent appears stalled after ${idleSecs}s. Retry with a narrower next step.`,
  };
}

async function callJudge(
  pi: ExtensionAPI,
  ctx: any,
  summary: string,
  timeSinceActivityMs: number,
  consecutiveInterventions: number,
): Promise<JudgeResult> {
  const idleSecs = Math.round(timeSinceActivityMs / 1_000);
  const judgePrompt = `You are monitoring a coding agent session. Return only JSON.
Keys: action, message.
Actions: continue, nudge, abort.

The agent has been idle for ${idleSecs} seconds.
There have been ${consecutiveInterventions} prior watchdog interventions.

Recent activity:
${summary}`;

  const candidates = [
    { provider: "Llama Server", model: "pi-local" },
    { provider: "LM Studio", model: "pi-local" },
  ];
  if (ctx?.model?.provider && ctx?.model?.id) {
    if (!candidates.some((candidate) => candidate.provider === ctx.model.provider && candidate.model === ctx.model.id)) {
      candidates.push({ provider: ctx.model.provider, model: ctx.model.id });
    }
  }

  for (const candidate of candidates) {
    try {
      const result = await pi.exec(
        "pi",
        [
          "-p",
          "--no-session",
          "--no-tools",
          "--provider",
          candidate.provider,
          "--model",
          candidate.model,
          judgePrompt,
        ],
        { timeout: 20_000 },
      );

      if (result.code !== 0 || !result.stdout?.trim()) {
        continue;
      }

      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.action === "continue" || parsed.action === "nudge" || parsed.action === "abort") {
        return {
          action: parsed.action,
          message: String(parsed.message ?? ""),
          available: true,
        };
      }
    } catch {
      continue;
    }
  }

  return {
    action: "continue",
    message: "Judge unavailable",
    available: false,
  };
}

export default function (pi: ExtensionAPI) {
  let lastActivityTimestamp = Date.now();
  let consecutiveInterventions = 0;
  let enabled = false;
  let checkIntervalMs = 5 * 60 * 1_000;
  let stuckThresholdMs = 5 * 60 * 1_000;
  const maxInterventions = 3;

  let checkInterval: ReturnType<typeof setInterval> | null = null;
  let sessionCtx: any = null;
  let judgeInProgress = false;

  function emitStatus(): void {
    if (!sessionCtx) return;
    const status = buildWatchdogBadge(enabled, Math.round(checkIntervalMs / 60_000));
    if (sessionCtx.hasUI) {
      sessionCtx.ui.setStatus(
        STATUS_KEYS.watchdog,
        serializeBadge({ text: status.label, level: status.level }),
      );
    }
    pi.events.emit(WATCHDOG_STATUS_EVENT, status, sessionCtx);
  }

  function updateActivity(): void {
    lastActivityTimestamp = Date.now();
  }

  function startTimer(ctx: any): void {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(async () => {
      if (!enabled || !ctx || ctx.isIdle()) return;

      const timeSinceActivity = Date.now() - lastActivityTimestamp;
      if (timeSinceActivity < stuckThresholdMs || judgeInProgress) return;

      judgeInProgress = true;
      try {
        if (consecutiveInterventions >= maxInterventions) {
          await ctx.abort();
          pi.sendUserMessage(
            `[Watchdog] Giving up after ${maxInterventions} intervention attempts. The current operation was cancelled.`,
            { deliverAs: "followUp" },
          );
          enabled = false;
          emitStatus();
          return;
        }

        const deterministic = buildDeterministicDecision(ctx, timeSinceActivity, stuckThresholdMs);
        const summary = formatSessionSummary(ctx);
        const judged = await callJudge(pi, ctx, summary, timeSinceActivity, consecutiveInterventions);

        let action = deterministic.action;
        let message = deterministic.message;
        if (judged.available) {
          if (judged.action === "abort") {
            action = "abort";
          }
          if (judged.action !== "continue" && judged.message.trim()) {
            message = judged.message.trim();
          }
        }

        await ctx.abort();
        if (action === "abort") {
          pi.sendUserMessage(
            `[Watchdog] ${message} Session stopped to avoid wasting more context or time.`,
            { deliverAs: "followUp" },
          );
          enabled = false;
        } else {
          pi.sendUserMessage(
            `[Watchdog] ${message} The blocked operation was cancelled. Try a different approach.`,
            { deliverAs: "followUp" },
          );
          consecutiveInterventions += 1;
        }
        lastActivityTimestamp = Date.now();
        emitStatus();
      } catch {
        // Never let the watchdog crash the session.
      } finally {
        judgeInProgress = false;
      }
    }, checkIntervalMs);
  }

  pi.on("turn_end", async () => {
    updateActivity();
  });

  pi.on("tool_execution_end", async () => {
    updateActivity();
  });

  pi.on("tool_execution_update", async () => {
    updateActivity();
  });

  pi.on("message_end", async () => {
    updateActivity();
  });

  pi.on("agent_end", async () => {
    updateActivity();
  });

  pi.on("session_start", async (_event, ctx) => {
    sessionCtx = ctx;
    lastActivityTimestamp = Date.now();
    consecutiveInterventions = 0;
    emitStatus();
    if (enabled) startTimer(ctx);
  });

  pi.on("session_shutdown", async () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    if (sessionCtx?.hasUI) {
      sessionCtx.ui.setStatus(STATUS_KEYS.watchdog, undefined);
    }
    sessionCtx = null;
  });

  pi.registerCommand("watchdog", {
    description: "Toggle watchdog or set interval in minutes (e.g. /watchdog off, /watchdog on, /watchdog 3)",
    handler: async (args, ctx) => {
      sessionCtx = ctx;
      const arg = (args ?? "").trim().toLowerCase();

      if (arg === "off") {
        enabled = false;
        emitStatus();
        return "Watchdog disabled.";
      }

      if (arg === "on") {
        enabled = true;
        consecutiveInterventions = 0;
        lastActivityTimestamp = Date.now();
        emitStatus();
        startTimer(ctx);
        return `Watchdog enabled (${Math.round(checkIntervalMs / 60_000)}m).`;
      }

      if (arg === "") {
        enabled = !enabled;
        if (enabled) {
          consecutiveInterventions = 0;
          lastActivityTimestamp = Date.now();
          startTimer(ctx);
        }
        emitStatus();
        return enabled
          ? `Watchdog enabled (${Math.round(checkIntervalMs / 60_000)}m).`
          : "Watchdog disabled.";
      }

      const minutes = parseInt(arg, 10);
      if (!isNaN(minutes) && minutes > 0) {
        checkIntervalMs = minutes * 60_000;
        stuckThresholdMs = checkIntervalMs;
        enabled = true;
        consecutiveInterventions = 0;
        lastActivityTimestamp = Date.now();
        emitStatus();
        startTimer(ctx);
        return `Watchdog set to ${minutes}m interval.`;
      }

      return `Unknown argument: "${arg}". Usage: /watchdog [off|on|<minutes>]`;
    },
  });
}
