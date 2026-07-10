import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";

import {
  createCallerFactory,
  createTRPCRouter,
  protectedProcedure,
  type TRPCContext,
} from "./init";

const testRouter = createTRPCRouter({
  ping: protectedProcedure.query(() => "pong"),
});

const createCaller = createCallerFactory(testRouter);

const makeContext = (userId: string | null): TRPCContext =>
  ({ auth: { userId } }) as TRPCContext;

describe("protectedProcedure", () => {
  it("resolves when the caller is authenticated", async () => {
    const caller = createCaller(makeContext("user_123"));

    await expect(caller.ping()).resolves.toBe("pong");
  });

  it("throws UNAUTHORIZED when the caller is not authenticated", async () => {
    const caller = createCaller(makeContext(null));

    await expect(caller.ping()).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.ping()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
