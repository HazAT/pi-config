import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Tool to prefill the editor (user still needs to press Enter)
  pi.registerTool({
    name: "prefill_editor",
    label: "Prefill Editor",
    description:
      "Prefills the user's input editor with text. Use this to suggest a command the user should run, like '/reload'. The user just needs to press Enter to execute.",
    parameters: Type.Object({
      text: Type.String({ description: "Text to prefill in the editor" }),
      message: Type.Optional(
        Type.String({ description: "Optional message to show the user explaining what to do" })
      ),
    }),

    async execute(toolCallId, params, onUpdate, ctx, signal) {
      if (ctx.hasUI) {
        ctx.ui.setEditorText(params.text);
      }

      const instruction = params.message || `Editor prefilled with: ${params.text} — press Enter to execute.`;

      return {
        content: [{ type: "text", text: instruction }],
        details: { prefilled: params.text },
      };
    },
  });

  // Tool to execute a command/message directly (self-invoke)
  pi.registerTool({
    name: "execute_command",
    label: "Execute Command",
    description: `Execute a slash command or send a message as if the user typed it. The message is added to the session history and triggers a new turn. Use this to:
- Self-invoke /answer after asking multiple questions
- Run /reload after creating skills
- Execute any slash command programmatically
- Send follow-up prompts to yourself

The command/message appears in the conversation as a user message.`,
    parameters: Type.Object({
      command: Type.String({ 
        description: "The command or message to execute (e.g., '/answer', '/reload', or any text)" 
      }),
      reason: Type.Optional(
        Type.String({ 
          description: "Optional explanation for why you're executing this command (shown to user)" 
        })
      ),
    }),

    async execute(toolCallId, params, onUpdate, ctx, signal) {
      const { command, reason } = params;

      // Send the command as a user message - it will be processed like typed input
      // Using followUp delivery so it happens after the current response completes
      pi.sendUserMessage(command, { deliverAs: "followUp" });

      const explanation = reason 
        ? `Executing: ${command}\nReason: ${reason}`
        : `Executing: ${command}`;

      return {
        content: [{ type: "text", text: explanation }],
        details: { 
          command,
          reason,
          executed: true,
        },
      };
    },
  });
}
