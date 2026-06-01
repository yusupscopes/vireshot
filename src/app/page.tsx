"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

const Page = () => {
  const [value, setValue] = React.useState("");
  const router = useRouter();

  const trpc = useTRPC();

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        router.push(`/projects/${data.id}`);
        toast.success("Project created!");
      },
      onError: (error) => {
        toast.error(`Failed to create project: ${error.message}`);
      },
    }),
  );

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="max-w-7xl mx-auto flex items-center flex-col gap-y-4 justify-center">
        <Input value={value} onChange={(e) => setValue(e.target.value)} />
        <Button
          disabled={createProject.isPending}
          onClick={() => createProject.mutate({ prompt: value })}
        >
          Create Project
        </Button>
      </div>
    </div>
  );
};

export default Page;
