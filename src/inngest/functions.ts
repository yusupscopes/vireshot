import { Sandbox } from "@e2b/code-interpreter";
import { openai, createAgent, createNetwork } from "@inngest/agent-kit";
import { z } from "zod";

import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "./prompt";
import { createSandboxTools } from "./tools";
import { prisma } from "@/lib/database";
import { AgentState } from "./types";

const messageEventSchema = z.object({
  value: z.string().min(1, "Message value must not be empty").max(4000),
  projectId: z.string().min(1, "Project ID is required"),
});

export const processMessage = inngest.createFunction(
  { id: "process-message", triggers: { event: "app/message.created" } },
  async ({ event, step }) => {
    const parsed = messageEventSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new Error(`Invalid message event: ${parsed.error.message}`);
    }

    const { value: messageValue } = parsed.data;

    const sandboxId = await step.run("create-sandbox", async () => {
      const template = process.env.E2B_TEMPLATE_NAME ?? "vire-nextjs-example";
      const sandbox = await Sandbox.create(template);
      return sandbox.sandboxId;
    });

    const codeAgent = createAgent<AgentState>({
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

    const network = createNetwork<AgentState>({
      name: "code-agent-network",
      agents: [codeAgent],
      maxIter: 10,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) return;
        return codeAgent;
      },
    });

    const result = await network.run(messageValue);

    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      if (!sandbox) {
        throw new Error(`Sandbox with ID ${sandboxId} not found`);
      }

      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again later.",
            role: "ASSISTANT",
            type: "ERROR",
          },
        });
      }

      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            },
          },
        },
      });
    });

    // TODO: We'll implement sandbox expire later, let the sandboxes live for now for easier debugging.
    // await step.run("cleanup-sandbox", async () => {
    //   const sandbox = await getSandbox(sandboxId);
    //   if (!sandbox) {
    //     throw new Error(`Sandbox with ID ${sandboxId} not found`);
    //   }
    //   await sandbox.kill();
    // });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  },
);
