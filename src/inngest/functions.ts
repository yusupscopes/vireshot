import { Sandbox } from "@e2b/code-interpreter";
import {
  openai,
  createAgent,
  createTool,
  createNetwork,
} from "@inngest/agent-kit";
import { z } from "zod";

import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "@/prompt";

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
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };

              const sandbox = await getSandbox(sandboxId);
              if (!sandbox) {
                console.error(
                  `Command failed: ${sandbox} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`,
                );
                throw new Error(
                  `Command failed: ${sandbox} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`,
                );
              }

              const processCommand = await sandbox.commands.run(command, {
                onStdout: (data: string) => {
                  buffers.stdout += data;
                },
                onStderr: (err: string) => {
                  buffers.stderr += err;
                },
              });

              return processCommand.stdout;
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox.",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(), // File path, e.g. "src/index.js"
                content: z.string(), // File content
              }),
            ),
          }),
          handler: async ({ files }, { step, network }) => {
            const newFiles = await step?.run(
              "createOrUpdateFiles",
              async () => {
                const sandbox = await getSandbox(sandboxId);
                if (!sandbox) {
                  throw new Error(`Sandbox with ID ${sandboxId} not found`);
                }

                const updatedFiles = network.state.data.files || {};
                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              },
            );

            // network.state.data is managed by agent-kit for cross-iteration
            // state within a single network.run(). It is ephemeral to this
            // execution; Inngest durability is provided by the surrounding
            // step?.run for the actual file-system side effects.
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox.",
          parameters: z.object({
            paths: z.array(z.string()), // Array of file paths, e.g. ["src/index.js", "src/App.js"]
          }),
          handler: async ({ paths }, { step }) => {
            return await step?.run("readFiles", async () => {
              const sandbox = await getSandbox(sandboxId);
              if (!sandbox) {
                throw new Error(`Sandbox with ID ${sandboxId} not found`);
              }

              const contents: Record<string, unknown>[] = [];
              for (const path of paths) {
                const content = await sandbox.files.read(path);
                contents.push({ path, content });
              }

              return JSON.stringify(contents);
            });
          },
        }),
      ],
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
