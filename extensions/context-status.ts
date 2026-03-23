import type { ContextUsage } from "@mariozechner/pi-coding-agent";
import type { Model } from "@mariozechner/pi-ai";

export default function () {}

export const WATCHDOG_STATUS_EVENT = "pi:watchdog_status";

export const STATUS_KEYS = {
  state: "pi_state",
  model: "pi_model",
  context: "pi_context",
  cost: "pi_cost",
  tool: "pi_tool",
  watchdog: "pi_watchdog",
} as const;

export type BadgeLevel = "ok" | "warn" | "danger" | "muted";

export interface BadgeSpec {
  text: string;
  level: BadgeLevel;
}

export interface WatchdogStatusPayload {
  enabled: boolean;
  intervalMinutes: number;
  label: string;
  level: BadgeLevel;
}

export interface StatusSnapshot {
  state: BadgeSpec;
  model: BadgeSpec;
  context: BadgeSpec;
  cost?: BadgeSpec;
  tool?: BadgeSpec;
  watchdog?: BadgeSpec;
  contextPercent: number | null;
  contextWindow: number | null;
  tokens: number | null;
}

const WARN_PERCENT = 70;
const DANGER_PERCENT = 85;

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function shortProvider(provider?: string): string {
  if (!provider) return "model";
  if (provider === "Llama Server") return "Llama";
  if (provider === "LM Studio") return "LM";
  if (provider === "openai-codex") return "Codex";
  if (provider === "openai") return "OpenAI";
  if (provider === "anthropic") return "Anthropic";
  return provider;
}

export function shortModelId(id?: string): string {
  if (!id) return "unknown";
  return id
    .replace(/^[^/]+\//, "")
    .replace(/^claude-/, "")
    .replace(/-\d{8}$/, "");
}

export function badgeLevelFromPercent(percent: number | null): BadgeLevel {
  if (percent == null) return "muted";
  if (percent >= DANGER_PERCENT) return "danger";
  if (percent >= WARN_PERCENT) return "warn";
  return "ok";
}

export function buildWatchdogBadge(
  enabled: boolean,
  intervalMinutes: number,
): WatchdogStatusPayload {
  return enabled
    ? {
        enabled: true,
        intervalMinutes,
        label: `watch ${intervalMinutes}m`,
        level: "ok",
      }
    : {
        enabled: false,
        intervalMinutes,
        label: "watch off",
        level: "muted",
      };
}

export function serializeBadge(badge?: BadgeSpec): string | undefined {
  if (!badge) return undefined;
  return `${badge.level}|${badge.text}`;
}

export function parseBadge(value?: string): BadgeSpec | undefined {
  if (!value) return undefined;
  const [maybeLevel, ...rest] = value.split("|");
  if (!rest.length) {
    return { text: value, level: "muted" };
  }
  const level = isBadgeLevel(maybeLevel) ? maybeLevel : "muted";
  return { text: rest.join("|"), level };
}

function isBadgeLevel(value: string): value is BadgeLevel {
  return value === "ok" || value === "warn" || value === "danger" || value === "muted";
}

export function buildContextBadge(usage?: ContextUsage): {
  badge: BadgeSpec;
  tokens: number | null;
  percent: number | null;
  contextWindow: number | null;
} {
  if (!usage || usage.tokens == null) {
    return {
      badge: { text: "context unknown", level: "muted" },
      tokens: null,
      percent: null,
      contextWindow: usage?.contextWindow ?? null,
    };
  }

  const tokens = usage.tokens;
  const window = Number.isFinite(usage.contextWindow) && usage.contextWindow > 0
    ? usage.contextWindow
    : null;
  const percent = window && usage.percent != null ? usage.percent : null;
  const level = badgeLevelFromPercent(percent);

  if (!window || percent == null) {
    return {
      badge: {
        text: `${formatTokens(tokens)} used`,
        level,
      },
      tokens,
      percent,
      contextWindow: window,
    };
  }

  const remaining = Math.max(window - tokens, 0);
  return {
    badge: {
      text: `${formatTokens(tokens)}/${formatTokens(window)} ${Math.round(percent)}% ${formatTokens(remaining)} left`,
      level,
    },
    tokens,
    percent,
    contextWindow: window,
  };
}

export function buildStatusSnapshot(input: {
  model?: Model<any>;
  usage?: ContextUsage;
  sessionCost: number;
  activeTool?: string | null;
  watchdog?: WatchdogStatusPayload;
  state: "idle" | "working";
}): StatusSnapshot {
  const context = buildContextBadge(input.usage);
  const modelText = input.model
    ? `${shortProvider(input.model.provider)}:${shortModelId(input.model.id)}`
    : "model ?";

  return {
    state: {
      text: input.state,
      level: input.state === "working" ? "warn" : "ok",
    },
    model: {
      text: modelText,
      level: "muted",
    },
    context: context.badge,
    cost: input.sessionCost > 0
      ? { text: formatCost(input.sessionCost), level: "ok" }
      : undefined,
    tool: input.activeTool
      ? { text: input.activeTool, level: "muted" }
      : undefined,
    watchdog: input.watchdog
      ? { text: input.watchdog.label, level: input.watchdog.level }
      : undefined,
    contextPercent: context.percent,
    contextWindow: context.contextWindow,
    tokens: context.tokens,
  };
}

export function cmuxColorForLevel(level: BadgeLevel): string {
  if (level === "danger") return "#EF4444";
  if (level === "warn") return "#F59E0B";
  if (level === "ok") return "#22C55E";
  return "#6B7280";
}
