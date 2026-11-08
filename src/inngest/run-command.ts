import { CommandExitError, TimeoutError } from "@e2b/code-interpreter";

/** The slice of an E2B `Sandbox` this module needs; lets tests pass a fake. */
export type CommandRunner = {
  commands: {
    run: (
      command: string,
      opts?: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
      },
    ) => Promise<{ exitCode: number }>;
  };
};

export interface CommandOutput {
  stdout: string;
  stderr: string;
  /** `null` when the command was killed before it exited (timeout). */
  exitCode: number | null;
}

/**
 * Runs a command in the sandbox and always returns its output to the agent.
 *
 * E2B throws `CommandExitError` on any non-zero exit. A failed command is a
 * normal outcome the agent should see and correct (e.g. a bad `npm install`),
 * not a step failure worth retrying, so it is returned as a result. Only
 * unexpected errors (e.g. a lost sandbox connection) are rethrown.
 */
export async function runSandboxCommand(
  sandbox: CommandRunner,
  command: string,
): Promise<CommandOutput> {
  const buffers = { stdout: "", stderr: "" };

  try {
    const result = await sandbox.commands.run(command, {
      onStdout: (data: string) => {
        buffers.stdout += data;
      },
      onStderr: (data: string) => {
        buffers.stderr += data;
      },
    });
    return { ...buffers, exitCode: result.exitCode };
  } catch (error) {
    if (error instanceof CommandExitError) {
      return {
        stdout: error.stdout || buffers.stdout,
        stderr: error.stderr || buffers.stderr,
        exitCode: error.exitCode,
      };
    }

    if (error instanceof TimeoutError) {
      return {
        stdout: buffers.stdout,
        stderr: `${buffers.stderr}\nCommand timed out: ${error.message}. Do not run long-running or interactive commands.`.trim(),
        exitCode: null,
      };
    }

    throw error;
  }
}
