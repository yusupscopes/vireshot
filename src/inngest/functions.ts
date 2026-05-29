import { Sandbox } from "@e2b/code-interpreter";
import { openai, createAgent } from "@inngest/agent-kit";
import { z } from "zod";

import { inngest } from "./client";
import { getSandbox } from "./utils";

const taskEventSchema = z.object({
  value: z.string().min(1, "Task value must not be empty"),
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
      const template =
        process.env.E2B_TEMPLATE_NAME ?? "vire-nextjs-example";
      const sandbox = await Sandbox.create(template);
      return sandbox.sandboxId;
    });

    const codeAgent = createAgent({
      name: "code-agent",
      system:
        "You are an expert Next.js developer, you write readable, maintainable code. You write simple Next.js & React snippets.",
      model: openai({ model: "gpt-4o" }),
    });

    const { output } = await codeAgent.run(
      `Write the following snippet: ${taskValue}`,
    );

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("cleanup-sandbox", async () => {
      const sandbox = await getSandbox(sandboxId);
      await sandbox.kill();
    });

    return { output, sandboxUrl };
  },
);
