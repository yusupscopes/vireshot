import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/database";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "Project ID is required" }),
      }),
    )
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });

      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    return await prisma.project.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
      where: {
        userId: ctx.auth.userId,
      },
    });
  }),
  create: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1, { message: "Message is required" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          name: generateSlug(2, {
            format: "kebab",
          }),
          messages: {
            create: {
              content: input.prompt,
              role: "USER",
              type: "PROMPT",
            },
          },
        },
      });

      await inngest.send({
        name: "app/message.created",
        data: {
          value: input.prompt,
          projectId: createdProject.id,
        },
      });

      return createdProject;
    }),
});
