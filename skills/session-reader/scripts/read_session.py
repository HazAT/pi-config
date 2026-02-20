# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""
Parse pi session JSONL files into readable formats.

Usage:
    uv run read_session.py <session_path> [--mode MODE] [--offset N] [--limit N] [--max-content N]

Modes:
    overview      Session metadata + turn-by-turn summary (default)
    conversation  User and assistant text only (no tool calls/results)
    full          Everything including tool calls and results
    tools         Tool calls and results only
    costs         Cost breakdown per assistant turn
    subagents     Subagent calls: task, agent, model, cost, status, session paths
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime


def parse_args():
    parser = argparse.ArgumentParser(description="Read pi session JSONL files")
    parser.add_argument("session_path", help="Path to the .jsonl session file")
    parser.add_argument(
        "--mode",
        choices=["overview", "conversation", "full", "tools", "costs", "subagents"],
        default="overview",
        help="Output mode (default: overview)",
    )
    parser.add_argument("--offset", type=int, default=0, help="Skip first N message turns")
    parser.add_argument("--limit", type=int, default=0, help="Show at most N message turns (0=all)")
    parser.add_argument(
        "--max-content",
        type=int,
        default=2000,
        help="Max chars per content block (default: 2000, 0=unlimited)",
    )
    return parser.parse_args()


def truncate(text: str, max_len: int) -> str:
    if max_len <= 0 or len(text) <= max_len:
        return text
    return text[:max_len] + f"\n... [truncated, {len(text)} chars total]"


def format_timestamp(ts) -> str:
    if not ts:
        return "?"
    try:
        if isinstance(ts, (int, float)):
            dt = datetime.fromtimestamp(ts / 1000)
            return dt.strftime("%H:%M:%S")
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        return dt.strftime("%H:%M:%S")
    except (ValueError, AttributeError, OSError):
        return str(ts)[:8]


def format_duration(ms: int | float) -> str:
    secs = int(ms / 1000)
    if secs < 60:
        return f"{secs}s"
    mins = secs // 60
    secs = secs % 60
    return f"{mins}m{secs}s"


def parse_session(path: str) -> tuple[dict, list[dict], list[dict]]:
    """Parse a session file into (metadata, events, messages)."""
    metadata = {}
    events = []
    messages = []

    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            t = obj.get("type")

            if t == "session":
                metadata = obj
            elif t in ("model_change", "thinking_level_change"):
                events.append(obj)
            elif t == "message":
                messages.append(obj)

    return metadata, events, messages


def extract_subagent_details(msg: dict) -> dict | None:
    """Extract subagent details from a toolResult message."""
    if msg.get("role") != "toolResult" or msg.get("toolName") != "subagent":
        return None
    details = msg.get("details")
    if not details:
        return None
    return details


def extract_turns(messages: list[dict]) -> list[dict]:
    """Convert raw message entries into structured turns."""
    turns = []

    for entry in messages:
        msg = entry.get("message", {})
        role = msg.get("role", "")
        content = msg.get("content", "")
        timestamp = entry.get("timestamp", msg.get("timestamp", ""))

        turn = {
            "role": role,
            "timestamp": timestamp,
            "texts": [],
            "tool_calls": [],
            "thinking": [],
            "is_error": msg.get("isError", False),
        }

        # Extract cost info from assistant messages
        if role == "assistant":
            usage = msg.get("usage", {})
            if usage:
                turn["model"] = msg.get("model", "")
                turn["provider"] = msg.get("provider", "")
                turn["usage"] = usage
                turn["stop_reason"] = msg.get("stopReason", "")

        if isinstance(content, str):
            if content.strip():
                turn["texts"].append(content)
        elif isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                item_type = item.get("type", "")

                if item_type == "text" and item.get("text", "").strip():
                    turn["texts"].append(item["text"])
                elif item_type == "toolCall":
                    turn["tool_calls"].append(
                        {
                            "id": item.get("id", ""),
                            "name": item.get("name", ""),
                            "arguments": item.get("arguments", {}),
                        }
                    )
                elif item_type == "thinking":
                    thinking_text = item.get("thinking", "")
                    if thinking_text:
                        turn["thinking"].append(thinking_text)

        # For toolResult messages
        if role == "toolResult":
            turn["tool_call_id"] = msg.get("toolCallId", "")
            turn["tool_name"] = msg.get("toolName", "")
            result_content = msg.get("content", "")
            turn["texts"] = []
            if isinstance(result_content, list):
                for item in result_content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        turn["texts"].append(item.get("text", ""))
            elif isinstance(result_content, str) and result_content.strip():
                turn["texts"].append(result_content)

            # Capture subagent details
            subagent_details = extract_subagent_details(msg)
            if subagent_details:
                turn["subagent_details"] = subagent_details

        turns.append(turn)

    return turns


def format_subagent_summary(details: dict) -> str:
    """Format a compact subagent result summary."""
    mode = details.get("mode", "?")
    results = details.get("results", [])

    parts = []
    total_cost = 0
    total_duration = 0

    for r in results:
        agent = r.get("agent", "?")
        exit_code = r.get("exitCode", -1)
        status_icon = "✓" if exit_code == 0 else "❌"
        model = r.get("model", "")
        usage = r.get("usage", {})
        cost = usage.get("cost", 0)
        total_cost += cost
        progress = r.get("progressSummary", {})
        duration = progress.get("durationMs", 0)
        total_duration += duration
        tool_count = progress.get("toolCount", 0)
        task = r.get("task", "")[:100].replace("\n", " ")

        parts.append(f"  {status_icon} {agent} ({model}): {task}")
        if cost or duration:
            parts.append(f"    ${cost:.4f} | {format_duration(duration)} | {tool_count} tools")

    header = f"🔀 SUBAGENT [{mode}] — {len(results)} run(s), ${total_cost:.4f}, {format_duration(total_duration)}"
    return header + "\n" + "\n".join(parts)


def print_overview(metadata: dict, events: list[dict], turns: list[dict], args):
    """Print session metadata and a summary of each turn."""
    print("=" * 70)
    print("SESSION OVERVIEW")
    print("=" * 70)
    print(f"  ID:        {metadata.get('id', 'N/A')}")
    print(f"  CWD:       {metadata.get('cwd', 'N/A')}")
    print(f"  Started:   {metadata.get('timestamp', 'N/A')}")
    print(f"  Version:   {metadata.get('version', 'N/A')}")

    for evt in events:
        if evt["type"] == "model_change":
            print(f"  Model:     {evt.get('provider', '')}/{evt.get('modelId', '')}")
        elif evt["type"] == "thinking_level_change":
            print(f"  Thinking:  {evt.get('thinkingLevel', '')}")

    # Cost summary (main session only)
    total_cost = 0
    total_input = 0
    total_output = 0
    for turn in turns:
        usage = turn.get("usage", {})
        cost = usage.get("cost", {})
        total_cost += cost.get("total", 0)
        total_input += usage.get("input", 0)
        total_output += usage.get("output", 0)

    # Subagent cost summary
    subagent_cost = 0
    subagent_count = 0
    for turn in turns:
        details = turn.get("subagent_details")
        if details:
            subagent_count += 1
            for r in details.get("results", []):
                subagent_cost += r.get("usage", {}).get("cost", 0)

    if total_cost > 0:
        print(f"  Session cost: ${total_cost:.4f}")
        print(f"  Session tokens: {total_input + total_output:,} (in:{total_input:,} out:{total_output:,})")
    if subagent_cost > 0:
        print(f"  Subagent cost:  ${subagent_cost:.4f} ({subagent_count} invocations)")
        print(f"  TOTAL cost:     ${total_cost + subagent_cost:.4f}")

    user_turns = sum(1 for t in turns if t["role"] == "user")
    assistant_turns = sum(1 for t in turns if t["role"] == "assistant")
    tool_results = sum(1 for t in turns if t["role"] == "toolResult")
    print(f"  Turns:     {len(turns)} total ({user_turns} user, {assistant_turns} assistant, {tool_results} tool results)")
    if subagent_count:
        print(f"  Subagent invocations: {subagent_count}")
    print()

    # Turn-by-turn summary
    print("-" * 70)
    print("TURN SUMMARY")
    print("-" * 70)

    turn_num = 0
    for turn in turns:
        role = turn["role"]
        ts = format_timestamp(turn["timestamp"])

        if role == "user":
            turn_num += 1
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break
            text = " ".join(turn["texts"])[:200].replace("\n", " ")
            print(f"\n[{ts}] 👤 USER #{turn_num}: {text}")

        elif role == "assistant":
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break

            parts = []
            if turn["texts"]:
                text_preview = turn["texts"][0][:150].replace("\n", " ")
                parts.append(f'"{text_preview}"')
            if turn["tool_calls"]:
                tool_names = [tc["name"] for tc in turn["tool_calls"]]
                parts.append(f"tools: [{', '.join(tool_names)}]")

            usage = turn.get("usage", {})
            cost = usage.get("cost", {})
            cost_str = f" (${cost['total']:.4f})" if cost.get("total") else ""

            summary = " | ".join(parts) if parts else "(empty)"
            print(f"[{ts}] 🤖 ASSISTANT: {summary}{cost_str}")

        elif role == "toolResult":
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break

            # Subagent results get special formatting
            details = turn.get("subagent_details")
            if details:
                print(f"[{ts}]   {format_subagent_summary(details)}")
            else:
                text = " ".join(turn["texts"])
                preview = text[:100].replace("\n", " ") if text else "(empty)"
                err = " ❌" if turn["is_error"] else ""
                print(f"[{ts}]   ↳ {turn.get('tool_name', '?')}{err}: {preview}")


def print_conversation(turns: list[dict], args):
    """Print only user and assistant text (no tool calls)."""
    print("=" * 70)
    print("CONVERSATION")
    print("=" * 70)

    turn_num = 0
    for turn in turns:
        role = turn["role"]

        if role == "user":
            turn_num += 1
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break
            ts = format_timestamp(turn["timestamp"])
            print(f"\n{'─' * 50}")
            print(f"👤 USER [{ts}]")
            print(f"{'─' * 50}")
            for text in turn["texts"]:
                print(truncate(text, args.max_content))

        elif role == "assistant" and turn["texts"]:
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break
            ts = format_timestamp(turn["timestamp"])
            print(f"\n🤖 ASSISTANT [{ts}]")
            for text in turn["texts"]:
                print(truncate(text, args.max_content))

        elif role == "toolResult" and turn.get("subagent_details"):
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break
            # Show subagent results in conversation view too
            details = turn["subagent_details"]
            print(f"\n{format_subagent_summary(details)}")


def print_full(turns: list[dict], args):
    """Print everything including tool calls and results."""
    print("=" * 70)
    print("FULL SESSION")
    print("=" * 70)

    turn_num = 0
    for turn in turns:
        role = turn["role"]
        ts = format_timestamp(turn["timestamp"])

        if role == "user":
            turn_num += 1
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break
            print(f"\n{'═' * 60}")
            print(f"👤 USER [{ts}]")
            print(f"{'═' * 60}")
            for text in turn["texts"]:
                print(truncate(text, args.max_content))

        elif role == "assistant":
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break
            model = turn.get("model", "")
            print(f"\n🤖 ASSISTANT [{ts}]{f' ({model})' if model else ''}")

            if turn["thinking"]:
                for thought in turn["thinking"]:
                    print(f"  💭 THINKING: {truncate(thought, args.max_content)}")

            for text in turn["texts"]:
                print(truncate(text, args.max_content))

            for tc in turn["tool_calls"]:
                args_str = json.dumps(tc["arguments"])
                print(f"\n  🔧 TOOL CALL: {tc['name']}")
                print(f"     {truncate(args_str, args.max_content)}")

        elif role == "toolResult":
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break

            details = turn.get("subagent_details")
            if details:
                print(f"\n  {format_subagent_summary(details)}")
                # Also show artifact paths for drill-down
                for r in details.get("results", []):
                    ap = r.get("artifactPaths", {})
                    sf = r.get("sessionFile", "")
                    if sf:
                        print(f"    📁 session: {sf}")
                    if ap.get("jsonlPath"):
                        print(f"    📁 artifact jsonl: {ap['jsonlPath']}")
                    if ap.get("outputPath"):
                        print(f"    📁 output: {ap['outputPath']}")
            else:
                err = " ❌ ERROR" if turn["is_error"] else ""
                print(f"\n  ↳ RESULT ({turn.get('tool_name', '?')}){err}:")
                for text in turn["texts"]:
                    print(f"     {truncate(text, args.max_content)}")


def print_tools(turns: list[dict], args):
    """Print only tool calls and their results."""
    print("=" * 70)
    print("TOOL CALLS")
    print("=" * 70)

    turn_num = 0
    tool_num = 0
    for turn in turns:
        if turn["role"] == "user":
            turn_num += 1

        if turn["role"] == "assistant" and turn["tool_calls"]:
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break
            ts = format_timestamp(turn["timestamp"])
            for tc in turn["tool_calls"]:
                tool_num += 1
                args_str = json.dumps(tc["arguments"])
                print(f"\n[{ts}] #{tool_num} {tc['name']}")
                print(f"  args: {truncate(args_str, args.max_content)}")

        elif turn["role"] == "toolResult":
            if args.offset and turn_num <= args.offset:
                continue
            if args.limit and turn_num > args.offset + args.limit:
                break

            details = turn.get("subagent_details")
            if details:
                print(f"  {format_subagent_summary(details)}")
            else:
                err = " ❌" if turn["is_error"] else " ✓"
                text = " ".join(turn["texts"])
                print(f"  result{err}: {truncate(text, min(args.max_content, 500))}")


def print_costs(turns: list[dict], args):
    """Print cost breakdown per assistant turn."""
    print("=" * 70)
    print("COST BREAKDOWN")
    print("=" * 70)
    print(f"{'#':<4} {'Time':<10} {'Model':<30} {'In':>8} {'Out':>8} {'Cache':>8} {'Cost':>10}")
    print("-" * 80)

    total_cost = 0
    turn_num = 0
    assistant_num = 0
    for turn in turns:
        if turn["role"] == "user":
            turn_num += 1
        if turn["role"] != "assistant" or not turn.get("usage"):
            continue

        assistant_num += 1
        if args.offset and turn_num <= args.offset:
            continue
        if args.limit and turn_num > args.offset + args.limit:
            break

        usage = turn["usage"]
        cost = usage.get("cost", {})
        total = cost.get("total", 0)
        total_cost += total
        ts = format_timestamp(turn["timestamp"])
        model = turn.get("model", "?")

        print(
            f"{assistant_num:<4} {ts:<10} {model:<30} "
            f"{usage.get('input', 0):>8,} {usage.get('output', 0):>8,} "
            f"{usage.get('cacheRead', 0):>8,} ${total:>9.4f}"
        )

    # Subagent costs
    subagent_cost = 0
    sub_num = 0
    for turn in turns:
        details = turn.get("subagent_details")
        if not details:
            continue
        for r in details.get("results", []):
            sub_num += 1
            usage = r.get("usage", {})
            cost = usage.get("cost", 0)
            subagent_cost += cost
            model = r.get("model", "?")
            agent = r.get("agent", "?")
            progress = r.get("progressSummary", {})
            tokens_in = usage.get("input", 0)
            tokens_out = usage.get("output", 0)
            cache = usage.get("cacheRead", 0)
            print(
                f"{'S'+str(sub_num):<4} {'subagent':<10} {agent+'/'+model:<30} "
                f"{tokens_in:>8,} {tokens_out:>8,} "
                f"{cache:>8,} ${cost:>9.4f}"
            )

    print("-" * 80)
    grand_total = total_cost + subagent_cost
    if subagent_cost > 0:
        print(f"{'SESSION':<54} ${total_cost:>9.4f}")
        print(f"{'SUBAGENTS':<54} ${subagent_cost:>9.4f}")
    print(f"{'TOTAL':<54} ${grand_total:>9.4f}")


def print_subagents(turns: list[dict], messages: list[dict], args):
    """Print detailed subagent information."""
    print("=" * 70)
    print("SUBAGENT RUNS")
    print("=" * 70)

    sub_num = 0
    found_any = False

    # Collect subagent calls and their details together
    for i, entry in enumerate(messages):
        msg = entry.get("message", {})
        details = extract_subagent_details(msg)
        if not details:
            continue

        found_any = True
        mode = details.get("mode", "?")
        results = details.get("results", [])
        artifacts = details.get("artifacts", {})

        # Find the matching subagent tool call (look backwards)
        call_args = {}
        for j in range(i - 1, max(i - 5, -1), -1):
            prev_msg = messages[j].get("message", {})
            prev_content = prev_msg.get("content", [])
            if isinstance(prev_content, list):
                for item in prev_content:
                    if isinstance(item, dict) and item.get("type") == "toolCall" and item.get("name") == "subagent":
                        call_args = item.get("arguments", {})
                        break

        print(f"\n{'━' * 60}")
        print(f"INVOCATION #{sub_num + 1} — mode: {mode}")
        print(f"{'━' * 60}")

        if call_args.get("chain"):
            print(f"  Chain steps: {len(call_args['chain'])}")
            for step in call_args["chain"]:
                print(f"    → {step.get('agent', '?')}: {str(step.get('task', ''))[:120]}")
        elif call_args.get("tasks"):
            print(f"  Parallel tasks: {len(call_args['tasks'])}")
            for t in call_args["tasks"]:
                print(f"    → {t.get('agent', '?')}: {str(t.get('task', ''))[:120]}")

        total_cost = 0
        total_duration = 0

        for r in results:
            sub_num += 1
            agent = r.get("agent", "?")
            exit_code = r.get("exitCode", -1)
            status = "✓ completed" if exit_code == 0 else "❌ failed"
            model = r.get("model", "")
            usage = r.get("usage", {})
            cost = usage.get("cost", 0)
            total_cost += cost
            turns_count = usage.get("turns", 0)
            progress = r.get("progressSummary", {})
            duration = progress.get("durationMs", 0)
            total_duration += duration
            tool_count = progress.get("toolCount", 0)
            skills = r.get("skills", [])
            task = r.get("task", "")
            session_file = r.get("sessionFile", "")
            artifact_paths = r.get("artifactPaths", {})

            print(f"\n  ── Run #{sub_num}: {agent} ──")
            print(f"  Status:   {status}")
            print(f"  Model:    {model}")
            print(f"  Task:     {truncate(task.replace(chr(10), ' '), 300)}")
            if skills:
                print(f"  Skills:   {', '.join(skills)}")
            print(f"  Cost:     ${cost:.4f}")
            print(f"  Duration: {format_duration(duration)}")
            print(f"  Tokens:   {usage.get('input', 0):,} in / {usage.get('output', 0):,} out / {usage.get('cacheRead', 0):,} cached")
            print(f"  Tools:    {tool_count} calls in {turns_count} turns")

            # Session & artifact paths
            if session_file:
                exists = Path(session_file).exists()
                marker = "" if exists else " (deleted)"
                print(f"  Session:  {session_file}{marker}")
            if artifact_paths.get("jsonlPath"):
                exists = Path(artifact_paths["jsonlPath"]).exists()
                marker = "" if exists else " (deleted)"
                print(f"  JSONL:    {artifact_paths['jsonlPath']}{marker}")
            if artifact_paths.get("outputPath"):
                exists = Path(artifact_paths["outputPath"]).exists()
                marker = "" if exists else " (deleted)"
                print(f"  Output:   {artifact_paths['outputPath']}{marker}")

        if len(results) > 1:
            print(f"\n  Combined: ${total_cost:.4f} | {format_duration(total_duration)}")

    if not found_any:
        print("\n  No subagent invocations found in this session.")


def main():
    args = parse_args()

    path = Path(args.session_path).expanduser()
    if not path.exists():
        print(f"Error: Session file not found: {path}", file=sys.stderr)
        sys.exit(1)

    metadata, events, messages = parse_session(str(path))
    turns = extract_turns(messages)

    if args.mode == "overview":
        print_overview(metadata, events, turns, args)
    elif args.mode == "conversation":
        print_conversation(turns, args)
    elif args.mode == "full":
        print_full(turns, args)
    elif args.mode == "tools":
        print_tools(turns, args)
    elif args.mode == "costs":
        print_costs(turns, args)
    elif args.mode == "subagents":
        print_subagents(turns, messages, args)


if __name__ == "__main__":
    main()
