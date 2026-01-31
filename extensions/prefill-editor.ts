import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
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
}
