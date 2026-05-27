// src/inngest/functions.ts
import { inngest } from "./client";

export const processTask = inngest.createFunction(
  { id: "process-task", triggers: { event: "app/task.created" } },
  async ({ event, step }) => {
    const result = await step.run("handle-task", async () => {
      return { processed: true, id: event.data.id };
    });

    await step.sleep("get transcript", "20s");

    await step.sleep("summarize content", "10s");

    return { message: `Task ${event.data.id} complete`, result };
  },
);
