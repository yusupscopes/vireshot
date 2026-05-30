import { Sandbox } from "@e2b/code-interpreter";
import { AgentResult, TextMessage } from "@inngest/agent-kit";

export async function getSandbox(sandboxId: string): Promise<Sandbox | null> {
  try {
    return await Sandbox.connect(sandboxId);
  } catch (error) {
    console.error(`Failed to connect to sandbox ${sandboxId}:`, error);
    return null;
  }
}

export function lastAssistantTextMessageContent(message: AgentResult) {
  const lastMessageIndex = message.output.findLastIndex(
    (entry) => entry.role === "assistant",
  );

  const result = message.output[lastMessageIndex] as TextMessage | undefined;

  return result?.content
    ? typeof result.content === "string"
      ? result.content
      : result.content.map((part) => part.text).join("")
    : undefined;
}
