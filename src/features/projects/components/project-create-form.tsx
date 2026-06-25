"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlignLeft, FolderPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const projectCreateFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(80),
  description: z.string().trim().max(240),
});

interface ProjectCreateFormProps {
  scrollable?: boolean;
  footer?: (submit: React.ReactNode) => React.ReactNode;
  onSuccess?: () => void;
}

export function ProjectCreateForm({
  scrollable,
  footer,
  onSuccess,
}: ProjectCreateFormProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.projects.create.mutationOptions({}),
  );

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
    validators: {
      onSubmit: projectCreateFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const project = await createMutation.mutateAsync({
          name: value.name,
          description: value.description || undefined,
        });

        await queryClient.invalidateQueries({
          queryKey: trpc.projects.getAll.queryKey(),
        });

        toast.success("Project created successfully!");
        form.reset();
        onSuccess?.();
        router.push(`/projects/${project.id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create project";

        toast.error(message);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className={cn("flex flex-col", scrollable ? "min-h-0 flex-1" : "gap-6")}
    >
      <div
        className={cn(
          scrollable
            ? "no-scrollbar flex flex-col gap-6 overflow-y-auto px-4"
            : "flex flex-col gap-6",
        )}
      >
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-0 flex h-full w-11 items-center justify-center">
                    <FolderPlus className="size-4 text-muted-foreground" />
                  </div>
                  <Input
                    id={field.name}
                    placeholder="Project name"
                    aria-invalid={isInvalid}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="pl-10"
                  />
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="description">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-0 flex h-full w-11 items-center justify-center">
                    <AlignLeft className="size-4 text-muted-foreground" />
                  </div>
                  <Textarea
                    id={field.name}
                    placeholder="Describe this project..."
                    aria-invalid={isInvalid}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="min-h-20 pl-10"
                    rows={3}
                  />
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Subscribe selector={(s) => ({ isSubmitting: s.isSubmitting })}>
          {({ isSubmitting }) => {
            const submitButton = (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create project"}
              </Button>
            );

            return footer ? footer(submitButton) : submitButton;
          }}
        </form.Subscribe>
      </div>
    </form>
  );
}