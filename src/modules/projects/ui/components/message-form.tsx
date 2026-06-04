import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextAreaAutosize from "react-textarea-autosize";
import z from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

interface Props {
  projectId: string;
}

const formSchema = z.object({
  prompt: z
    .string()
    .min(1, { message: "Prompt is required" })
    .max(4000, { message: "Prompt must be less than 4000 characters" }),
});

export const MessageForm = ({ projectId }: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const showUsage = false;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data);
  };

  return (
    <form
      className={cn(
        "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
        isFocused && "shadow-xs",
        showUsage && "rounded-t-none",
      )}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Controller
        name="prompt"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <TextAreaAutosize
              {...field}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              minRows={2}
              maxRows={8}
              placeholder="Put your great ideas here!"
              className="pt-4 resize-none border-none w-full outline-none bg-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)(e);
                }
              }}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex gap-x-2 items-end justify-between pt-2">
        <div className="text-[10px] text-muted-foreground font-mono">
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span>&#8984;</span>Enter
          </kbd>
          &nbsp;to submit
        </div>
        <Button className={cn("size-8 rounded-full")}>
          <ArrowUpIcon />
        </Button>
      </div>
    </form>
  );
};
