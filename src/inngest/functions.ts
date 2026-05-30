import { Sandbox } from "@e2b/code-interpreter";
import {
  openai,
  createAgent,
  createNetwork,
} from "@inngest/agent-kit";
import { z } from "zod";

import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "./prompt";
import { createSandboxTools } from "./tools";

const taskEventSchema = z.object({
  value: z.string().min(1, "Task value must not be empty").max(4000),
});

export const processTask = inngest.createFunction(
  { id: "process-task", triggers: { event: "app/task.created" } },
  async ({ event, step }) => {
    const parsed = taskEventSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new Error(`Invalid task event: ${parsed.error.message}`);
    }

    const { value: taskValue } = parsed.data;

    const sandboxId = await step.run("create-sandbox", async () => {
      const template = process.env.E2B_TEMPLATE_NAME ?? "vire-nextjs-example";
      const sandbox = await Sandbox.create(template);
      return sandbox.sandboxId;
    });

    const codeAgent = createAgent({
      name: "code-agent",
      description: "An expert coding agent.",
      system: PROMPT,
      model: openai({
        model: "gpt-4.1",
        defaultParameters: {
          temperature: 0.1,
        },
      }),
      tools: createSandboxTools(sandboxId),
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          // network.state.data is managed by agent-kit for cross-iteration
          // state within a single network.run(). It is ephemeral to this
          // execution and not individually checkpointed by Inngest.
          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork({
      name: "code-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) return;
        return codeAgent;
      },
    });

    const result = await network.run(taskValue);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      if (!sandbox) {
        throw new Error(`Sandbox with ID ${sandboxId} not found`);
      }

      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("cleanup-sandbox", async () => {
      const sandbox = await getSandbox(sandboxId);
      if (!sandbox) {
        throw new Error(`Sandbox with ID ${sandboxId} not found`);
      }
      await sandbox.kill();
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  },
);
