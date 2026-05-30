import { Sandbox } from "@e2b/code-interpreter";
import { AgentResult, TextMessage } from "@inngest/agent-kit";

export const MAX_READ_FILE_SIZE = 100_000; // 100KB
export const MAX_READ_RESPONSE_SIZE = 500_000; // 500KB

export async function getSandbox(sandboxId: string): Promise<Sandbox | null> {
  try {
    return await Sandbox.connect(sandboxId);
  } catch (error) {
    console.error(`Failed to connect to sandbox ${sandboxId}:`, error);
    return null;
  }
}

export function validateSandboxPath(path: string): string | null {
  if (path.includes("\0")) return "Path contains null bytes";
  if (path.includes("..")) return "Path traversal (..) is not allowed";
  return null;
}

export function lastAssistantTextMessageContent(message: AgentResult) {
  const lastMessageIndex = message.output.findLastIndex(
    (entry) => entry.role === "assistant",
  );
  if (lastMessageIndex === -1) return undefined;

  const result = message.output[lastMessageIndex] as TextMessage | undefined;
  if (!result?.content) return undefined;

  if (typeof result.content === "string") {
    return result.content;
  }

  return result.content.map((part) => part.text).join("");
}
