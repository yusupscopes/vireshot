import { describe, expect, it } from "vitest";
import { CommandExitError, TimeoutError } from "@e2b/code-interpreter";

import { runSandboxCommand, type CommandRunner } from "./run-command";

type RunOpts = Parameters<CommandRunner["commands"]["run"]>[1];

const fakeSandbox = (
  impl: (command: string, opts: RunOpts) => Promise<{ exitCode: number }>,
): CommandRunner => ({ commands: { run: impl } });

describe("runSandboxCommand", () => {
  it("returns streamed output and exit code for a successful command", async () => {
    const sandbox = fakeSandbox(async (_command, opts) => {
      opts?.onStdout?.("hello\n");
      return { exitCode: 0 };
    });

    await expect(runSandboxCommand(sandbox, "echo hello")).resolves.toEqual({
      stdout: "hello\n",
      stderr: "",
      exitCode: 0,
    });
  });

  it("returns stdout, stderr and exit code instead of throwing on a non-zero exit", async () => {
    const sandbox = fakeSandbox(async (_command, opts) => {
      opts?.onStdout?.("partial\n");
      opts?.onStderr?.("npm ERR! 404 not found\n");
      throw new CommandExitError({
        exitCode: 1,
        stdout: "partial\n",
        stderr: "npm ERR! 404 not found\n",
        error: "exit status 1",
      });
    });

    await expect(
      runSandboxCommand(sandbox, "npm install nope --yes"),
    ).resolves.toEqual({
      stdout: "partial\n",
      stderr: "npm ERR! 404 not found\n",
      exitCode: 1,
    });
  });

  it("reports a timed-out command to the agent instead of throwing", async () => {
    const sandbox = fakeSandbox(async (_command, opts) => {
      opts?.onStdout?.("starting\n");
      throw new TimeoutError("deadline exceeded");
    });

    const result = await runSandboxCommand(sandbox, "sleep 999");

    expect(result.stdout).toBe("starting\n");
    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain("timed out");
  });

  it("rethrows unexpected errors so the step can retry", async () => {
    const sandbox = fakeSandbox(async () => {
      throw new Error("sandbox connection lost");
    });

    await expect(runSandboxCommand(sandbox, "ls")).rejects.toThrow(
      "sandbox connection lost",
    );
  });
});
