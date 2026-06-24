"use client";

import {
  type FormEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { FileText, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import { ActiveCollaborators } from "@/features/collaborative-audio/components/active-collaborators";
import { LiveCursors } from "@/features/collaborative-audio/components/live-cursors";
import { LobbyProvider } from "@/features/collaborative-audio/contexts/lobby-provider";
import {
  useOthers,
  useUpdateMyPresence,
} from "@/features/collaborative-audio/lib/realtime";
import { useTRPC } from "@/trpc/client";

// const demoBlocks = [
//   {
//     speaker: "Narrator",
//     text: "Welcome to KoeGaIru. This project combines multiple voice clips into one final audio.",
//     status: "Generated",
//   },
//   {
//     speaker: "Character A",
//     text: "Instead of exporting every line manually, each block can become one reusable audio clip.",
//     status: "Ready to generate",
//   },
//   {
//     speaker: "Character B",
//     text: "Later, everyone in the organization can collaborate on this same project.",
//     status: "Draft",
//   },
// ];

export function ProjectDetailView({ projectId }: { projectId: string }) {
  return (
    <LobbyProvider projectId={projectId}>
      <ProjectDetailContent projectId={projectId} />
    </LobbyProvider>
  );
}

function ProjectDetailContent({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const [text, setText] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingRevision, setEditingRevision] = useState<number | null>(null);
  const editingBlockIdRef = useRef<string | null>(null);

  const { data: project } = useSuspenseQuery(
    trpc.projects.getById.queryOptions({ id: projectId }),
  );

  const invalidateProject = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.projects.getById.queryKey({ id: projectId }),
    });

  const createBlock = useMutation(
    trpc.projects.createBlock.mutationOptions({
      onSuccess: async () => {
        setText("");
        await invalidateProject();
        toast.success("Text block added");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateBlock = useMutation(
    trpc.projects.updateBlock.mutationOptions({
      onSuccess: async (_updatedBlock, variables) => {
        releaseBlockLock.mutate({ blockId: variables.blockId });
        updateMyPresence({ editingBlockId: null });
        setEditingBlockId(null);
        setEditingText("");
        setEditingRevision(null);
        await invalidateProject();
        toast.success("Text block updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const acquireBlockLock = useMutation(
    trpc.projects.acquireBlockLock.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const releaseBlockLock = useMutation(
    trpc.projects.releaseBlockLock.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  useEffect(() => {
    editingBlockIdRef.current = editingBlockId;
  }, [editingBlockId]);

  useEffect(() => {
    const releaseLock = releaseBlockLock.mutate;

    return () => {
      const blockId = editingBlockIdRef.current;

      if (blockId) {
        releaseLock({ blockId });
      }
    };
  }, [releaseBlockLock.mutate]);

  const deleteBlock = useMutation(
    trpc.projects.deleteBlock.mutationOptions({
      onSuccess: async (_deletedBlock, variables) => {
        if (editingBlockId === variables.blockId) {
          updateMyPresence({
            editingBlockId: null,
            selectedBlockId: null,
          });
          setEditingBlockId(null);
          setEditingText("");
          setEditingRevision(null);
        }

        await invalidateProject();
        toast.success("Text block deleted");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleCreateBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText) {
      toast.error("Block text is required");
      return;
    }

    createBlock.mutate({
      projectId,
      text: trimmedText,
    });
  };

  const handleStartEdit = (
    blockId: string,
    blockText: string,
    blockRevision: number,
  ) => {
    acquireBlockLock.mutate(
      { blockId },
      {
        onSuccess: () => {
          updateMyPresence({
            editingBlockId: blockId,
            selectedBlockId: blockId,
          });
          setEditingBlockId(blockId);
          setEditingText(blockText);
          setEditingRevision(blockRevision);
        },
      },
    );
  };

  const handleCancelEdit = () => {
    if (editingBlockId) {
      releaseBlockLock.mutate({ blockId: editingBlockId });
    }

    updateMyPresence({ editingBlockId: null });
    setEditingBlockId(null);
    setEditingText("");
    setEditingRevision(null);
  };

  const handleUpdateBlock = (
    event: FormEvent<HTMLFormElement>,
    blockId: string,
  ) => {
    event.preventDefault();

    const trimmedText = editingText.trim();

    if (!trimmedText) {
      toast.error("Block text is required");
      return;
    }

    if (!editingRevision) {
      toast.error("Missing block revision. Refresh and try again.");
      return;
    }

    updateBlock.mutate({
      blockId,
      text: trimmedText,
      revision: editingRevision,
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!window.confirm("Delete this text block?")) {
      return;
    }

    deleteBlock.mutate({ blockId });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    updateMyPresence({
      cursor: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  const handlePointerLeave = () => {
    updateMyPresence({ cursor: null });
  };

  return (
    <div
      className="flex flex-1 flex-col gap-6 p-6"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>

          {project.description && (
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>

        <ActiveCollaborators />
      </div>

      <form
        onSubmit={handleCreateBlock}
        className="rounded-lg border bg-background p-4"
      >
        <div className="flex flex-col gap-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write a text block..."
            className="min-h-24"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={createBlock.isPending || !text.trim()}
            >
              <Plus className="size-4" />
              {createBlock.isPending ? "Adding..." : "Add text block"}
            </Button>
          </div>
        </div>
      </form>

      {project.blocks.length === 0 ? (
        <Empty className="border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No blocks yet</EmptyTitle>
            <EmptyDescription>
              Add your first text block to start building this project.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : (
        <div className="grid gap-3">
          {project.blocks.map((block, index) => {
            const isEditing = editingBlockId === block.id;
            const otherEditingUser = others.find(
              (user) => user.presence.editingBlockId === block.id,
            );
            const isBusy =
              acquireBlockLock.isPending ||
              updateBlock.isPending ||
              deleteBlock.isPending ||
              releaseBlockLock.isPending;

            return (
              <div
                key={block.id}
                className="rounded-lg border bg-background p-5 shadow-sm"
                onClick={() =>
                  updateMyPresence({ selectedBlockId: block.id })
                }
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Block {index + 1}</p>
                    <Badge variant="outline">Text</Badge>
                    {otherEditingUser && (
                      <Badge variant="secondary">
                        {otherEditingUser.info?.name ?? "Someone"} is editing
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isBusy}
                      onClick={() =>
                        handleStartEdit(block.id, block.text, block.revision)
                      }
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit block</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isBusy}
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete block</span>
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <form
                    onSubmit={(event) => handleUpdateBlock(event, block.id)}
                    className="flex flex-col gap-3"
                  >
                    <Textarea
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      className="min-h-24"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={updateBlock.isPending}
                        onClick={handleCancelEdit}
                      >
                        <X className="size-4" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateBlock.isPending || !editingText.trim()}
                      >
                        <Save className="size-4" />
                        {updateBlock.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {block.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <LiveCursors />
    </div>
    // <div className="flex flex-1 flex-col gap-6 p-6">
    //   <div>
    //     <p className="text-sm text-muted-foreground">Project / {projectId}</p>
    //     <h1 className="text-2xl font-semibold tracking-tight">
    //       Demo voice project
    //     </h1>
    //   </div>

    //   <div className="grid gap-4">
    //     {demoBlocks.map((block, index) => (
    //       <div key={index} className="rounded-lg border bg-background p-5">
    //         <div className="mb-3 flex items-center justify-between">
    //           <p className="text-sm font-medium">{block.speaker}</p>
    //           <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
    //             {block.status}
    //           </span>
    //         </div>

    //         <p className="text-sm leading-6 text-muted-foreground">
    //           {block.text}
    //         </p>

    //         <div className="mt-4 h-10 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
    //           Audio clip preview placeholder
    //         </div>
    //       </div>
    //     ))}
    //   </div>
    // </div>
  );
}
