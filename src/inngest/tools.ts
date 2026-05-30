import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import {
  getSandbox,
  validateSandboxPath,
  MAX_READ_FILE_SIZE,
  MAX_READ_RESPONSE_SIZE,
} from "./utils";

export function createSandboxTools(sandboxId: string) {
  return [
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
            throw new Error(`Sandbox with ID ${sandboxId} not found`);
          }

          const processCommand = await sandbox.commands.run(command, {
            onStdout: (data: string) => {
              buffers.stdout += data;
            },
            onStderr: (err: string) => {
              buffers.stderr += err;
            },
          });

          return {
            stdout: buffers.stdout,
            stderr: buffers.stderr,
            exitCode: (processCommand as { exitCode?: number }).exitCode ?? 0,
          };
        });
      },
    }),
    createTool({
      name: "createOrUpdateFiles",
      description: "Create or update files in the sandbox.",
      parameters: z.object({
        files: z.array(
          z.object({
            path: z.string(),
            content: z.string(),
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
              const validationError = validateSandboxPath(file.path);
              if (validationError) {
                throw new Error(
                  `Invalid path "${file.path}": ${validationError}`,
                );
              }
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
        paths: z.array(z.string()),
      }),
      handler: async ({ paths }, { step }) => {
        return await step?.run("readFiles", async () => {
          const sandbox = await getSandbox(sandboxId);
          if (!sandbox) {
            throw new Error(`Sandbox with ID ${sandboxId} not found`);
          }

          const contents: Array<
            | { path: string; content: unknown }
            | { path: string; error: string }
          > = [];
          for (const path of paths) {
            const validationError = validateSandboxPath(path);
            if (validationError) {
              contents.push({ path, error: validationError });
              continue;
            }

            try {
              const content = await sandbox.files.read(path);
              const contentStr =
                typeof content === "string"
                  ? content
                  : JSON.stringify(content);
              if (contentStr.length > MAX_READ_FILE_SIZE) {
                contents.push({
                  path,
                  error: `File exceeds maximum size of ${MAX_READ_FILE_SIZE} bytes`,
                });
              } else {
                contents.push({ path, content });
              }
            } catch (err) {
              contents.push({
                path,
                error:
                  err instanceof Error ? err.message : "Failed to read file",
              });
            }
          }

          const response = JSON.stringify(contents);
          if (response.length > MAX_READ_RESPONSE_SIZE) {
            throw new Error(
              `Total response size exceeds maximum of ${MAX_READ_RESPONSE_SIZE} bytes`,
            );
          }
          return response;
        });
      },
    }),
  ];
}
