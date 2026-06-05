import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/database";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(
      z.object({
        id: z.string().min(1, { message: "Project ID is required" }),
      }),
    )
    .query(async ({ input }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!existingProject)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });

      return existingProject;
    }),
  getMany: baseProcedure.query(async () => {
    return await prisma.project.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    });
  }),
  create: baseProcedure
    .input(
      z.object({
        prompt: z.string().min(1, { message: "Message is required" }),
      }),
    )
    .mutation(async ({ input }) => {
      const createdProject = await prisma.project.create({
        data: {
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
