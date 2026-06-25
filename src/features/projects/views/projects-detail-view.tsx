"use client";

import {
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
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
import {
  Download,
  FileText,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
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
import { ProjectBlockActionBar } from "@/features/projects/components/project-block-action-bar";
import { ProjectBlockSettingsPanel } from "@/features/projects/components/project-block-settings-panel";
import { ProjectAudioPreview } from "@/features/projects/components/project-audio-preview";
import { ProjectTimeline } from "@/features/projects/components/project-timeline";
import { getProjectBlockAudioStateLabel } from "@/features/projects/lib/project-audio-state";
import { reorderBlockIds } from "@/features/projects/lib/reorder-blocks";
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

const BLOCK_ORDER_DRAG_TYPE = "application/x-koegairu-block-order";

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
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [draggingTimelineBlockId, setDraggingTimelineBlockId] = useState<
    string | null
  >(null);
  const editingBlockIdRef = useRef<string | null>(null);

  const { data: project } = useSuspenseQuery(
    trpc.projects.getById.queryOptions({ id: projectId }),
  );

  const { data: voices } = useSuspenseQuery(
    trpc.voices.getAll.queryOptions(),
  );

  const selectedBlock =
    project.blocks.find((block) => block.id === selectedBlockId) ?? null;
  const latestExport = project.exports[0] ?? null;
  const currentGeneratedBlockCount = project.blocks.filter(
    (block) => block.audioState === "CURRENT",
  ).length;
  const staleGeneratedBlockCount = project.blocks.filter(
    (block) => block.audioState === "STALE",
  ).length;

  const invalidateProject = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.projects.getById.queryKey({ id: projectId }),
    });

  const createBlock = useMutation(
    trpc.projects.createBlock.mutationOptions({
      onSuccess: async (createdBlock) => {
        setText("");
        setSelectedBlockId(createdBlock.id);
        updateMyPresence({ selectedBlockId: createdBlock.id });
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

  const updateBlockVoice = useMutation(
    trpc.projects.updateBlockVoice.mutationOptions({
      onSuccess: async (updatedBlock) => {
        setEditingRevision(updatedBlock.revision);
        await invalidateProject();
        toast.success("Block voice updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const generateBlockAudio = useMutation(
    trpc.projects.generateBlockAudio.mutationOptions({
      onSuccess: async (updatedBlock) => {
        setEditingRevision(updatedBlock.revision);
        await invalidateProject();
        toast.success("Block audio generated");
      },
      onError: async (error) => {
        await invalidateProject();
        toast.error(error.message);
      },
    }),
  );

  const reorderProjectBlocks = useMutation(
    trpc.projects.reorderBlocks.mutationOptions({
      onSuccess: async () => {
        await invalidateProject();
        toast.success("Block order updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
      onSettled: () => {
        setDraggingBlockId(null);
        setDragOverBlockId(null);
      },
    }),
  );

  const updateBlockTimeline = useMutation(
    trpc.projects.updateBlockTimeline.mutationOptions({
      onSuccess: async () => {
        await invalidateProject();
        toast.success("Timeline position updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
      onSettled: () => {
        setDraggingTimelineBlockId(null);
      },
    }),
  );

  const exportProjectAudio = useMutation(
    trpc.projects.exportProjectAudio.mutationOptions({
      onSuccess: async () => {
        await invalidateProject();
        toast.success("Project audio exported");
      },
      onError: async (error) => {
        await invalidateProject();
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

        if (selectedBlockId === variables.blockId) {
          setSelectedBlockId(null);
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

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    updateMyPresence({ selectedBlockId: blockId });
  };

  const handleBlockKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    blockId: string,
  ) => {
    if (event.currentTarget !== event.target) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelectBlock(blockId);
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!window.confirm("Delete this text block?")) {
      return;
    }

    deleteBlock.mutate({ blockId });
  };

  const handleUpdateBlockVoice = (blockId: string, voiceId: string) => {
    updateBlockVoice.mutate({ blockId, voiceId });
  };

  const handleGenerateBlockAudio = (blockId: string) => {
    generateBlockAudio.mutate({ blockId });
  };

  const handleBlockDragStart = (
    event: DragEvent<HTMLButtonElement>,
    blockId: string,
  ) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(BLOCK_ORDER_DRAG_TYPE, blockId);
    setDraggingBlockId(blockId);
    setSelectedBlockId(blockId);
    updateMyPresence({ selectedBlockId: blockId });
  };

  const handleBlockDragOver = (
    event: DragEvent<HTMLDivElement>,
    targetBlockId: string,
  ) => {
    if (!draggingBlockId || draggingBlockId === targetBlockId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverBlockId(targetBlockId);
  };

  const handleBlockDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setDragOverBlockId(null);
  };

  const handleBlockDrop = (
    event: DragEvent<HTMLDivElement>,
    targetBlockId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedBlockId =
      event.dataTransfer.getData(BLOCK_ORDER_DRAG_TYPE) || draggingBlockId;

    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggingBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    const currentBlockIds = project.blocks.map((block) => block.id);
    const reorderedBlockIds = reorderBlockIds(
      currentBlockIds,
      draggedBlockId,
      targetBlockId,
    );

    if (reorderedBlockIds === currentBlockIds) {
      setDraggingBlockId(null);
      setDragOverBlockId(null);
      return;
    }

    reorderProjectBlocks.mutate({
      projectId,
      blockIds: reorderedBlockIds,
    });
  };

  const handleBlockDragEnd = () => {
    setDraggingBlockId(null);
    setDragOverBlockId(null);
  };

  const handleTimelineDragStart = (blockId: string) => {
    setDraggingTimelineBlockId(blockId);
    handleSelectBlock(blockId);
  };

  const handleTimelineMoveBlock = (
    blockId: string,
    timelineStartMs: number,
  ) => {
    updateBlockTimeline.mutate({
      projectId,
      blockId,
      timelineStartMs,
    });
  };

  const handleTimelineResizeBlock = (
    blockId: string,
    timelineDurationMs: number,
  ) => {
    updateBlockTimeline.mutate({
      projectId,
      blockId,
      timelineDurationMs,
    });
  };

  const handleExportProjectAudio = () => {
    exportProjectAudio.mutate({ projectId });
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

  const isBlockActionPending =
    acquireBlockLock.isPending ||
    updateBlock.isPending ||
    updateBlockVoice.isPending ||
    generateBlockAudio.isPending ||
    reorderProjectBlocks.isPending ||
    updateBlockTimeline.isPending ||
    exportProjectAudio.isPending ||
    deleteBlock.isPending ||
    releaseBlockLock.isPending;

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

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ActiveCollaborators />
          <div className="flex flex-wrap items-center gap-2">
            {latestExport?.audioUrl && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={latestExport.audioUrl}>
                  <Download className="size-4" />
                  Download export
                </a>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={
                exportProjectAudio.isPending ||
                currentGeneratedBlockCount === 0 ||
                staleGeneratedBlockCount > 0
              }
              onClick={handleExportProjectAudio}
            >
              <Download className="size-4" />
              {exportProjectAudio.isPending ? "Exporting..." : "Export audio"}
            </Button>
          </div>
          {latestExport && (
            <p className="text-xs text-muted-foreground">
              Latest export: {latestExport.status.toLowerCase()}
              {latestExport.status === "READY"
                ? ` - ${latestExport.isLatest ? "latest" : "outdated"}`
                : ""}
              {latestExport.errorMessage ? ` - ${latestExport.errorMessage}` : ""}
            </p>
          )}
          {staleGeneratedBlockCount > 0 && (
            <p className="text-xs text-destructive">
              {staleGeneratedBlockCount} block
              {staleGeneratedBlockCount === 1 ? "" : "s"} need regeneration
              before export.
            </p>
          )}
        </div>
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
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-4">
            <ProjectTimeline
              blocks={project.blocks}
              selectedBlockId={selectedBlockId}
              draggingTimelineBlockId={draggingTimelineBlockId}
              isBusy={isBlockActionPending}
              onSelectBlock={handleSelectBlock}
              onDragStart={handleTimelineDragStart}
              onDragEnd={() => setDraggingTimelineBlockId(null)}
              onMoveBlock={handleTimelineMoveBlock}
              onResizeBlock={handleTimelineResizeBlock}
            />

            {project.blocks.map((block, index) => {
              const isEditing = editingBlockId === block.id;
              const isSelected = selectedBlockId === block.id;
              const isDragging = draggingBlockId === block.id;
              const isDragTarget =
                dragOverBlockId === block.id && draggingBlockId !== block.id;
              const otherEditingUser = others.find(
                (user) => user.presence.editingBlockId === block.id,
              );

              return (
                <div
                  key={block.id}
                  role="button"
                  tabIndex={0}
                  className={`rounded-lg border bg-background p-5 shadow-sm transition-colors ${
                    isSelected ? "border-primary/70 bg-primary/5" : ""
                  } ${isDragging ? "opacity-50" : ""} ${
                    isDragTarget ? "border-primary bg-primary/10" : ""
                  }`}
                  onClick={() => handleSelectBlock(block.id)}
                  onKeyDown={(event) => handleBlockKeyDown(event, block.id)}
                  onDragOver={(event) => handleBlockDragOver(event, block.id)}
                  onDragLeave={handleBlockDragLeave}
                  onDrop={(event) => handleBlockDrop(event, block.id)}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        draggable={!isBlockActionPending && !isEditing}
                        disabled={isBlockActionPending || isEditing}
                        className="cursor-grab active:cursor-grabbing"
                        onClick={(event) => event.stopPropagation()}
                        onDragStart={(event) =>
                          handleBlockDragStart(event, block.id)
                        }
                        onDragEnd={handleBlockDragEnd}
                      >
                        <GripVertical className="size-4" />
                        <span className="sr-only">Drag block</span>
                      </Button>
                      <p className="text-sm font-medium">Block {index + 1}</p>
                      <Badge variant="outline">Text</Badge>
                      <Badge variant="secondary">{block.status}</Badge>
                      {block.audioState !== "NO_AUDIO" && (
                        <Badge
                          variant={
                            block.audioState === "STALE"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {getProjectBlockAudioStateLabel(block.audioState)}
                        </Badge>
                      )}
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
                        disabled={isBlockActionPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStartEdit(block.id, block.text, block.revision);
                        }}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit block</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isBlockActionPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteBlock(block.id);
                        }}
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
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCancelEdit();
                          }}
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
                    <div className="flex flex-col gap-3">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {block.text}
                      </p>
                      {block.generation && block.audioState === "CURRENT" && (
                        <ProjectAudioPreview
                          audioUrl={block.generation.audioUrl}
                          text={block.generation.text}
                          voice={{
                            id: block.generation.voiceId,
                            name: block.generation.voiceName,
                          }}
                          compact
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <ProjectBlockActionBar
              selectedBlock={selectedBlock}
              voices={voices}
              isEditingSelectedBlock={
                selectedBlock ? editingBlockId === selectedBlock.id : false
              }
              isBusy={isBlockActionPending}
              className="xl:hidden"
              onStartEdit={(block) =>
                handleStartEdit(block.id, block.text, block.revision)
              }
              onVoiceChange={handleUpdateBlockVoice}
              onGenerate={handleGenerateBlockAudio}
            />
          </div>

          <ProjectBlockSettingsPanel
            project={project}
            selectedBlock={selectedBlock}
            voices={voices}
            isEditingSelectedBlock={
              selectedBlock ? editingBlockId === selectedBlock.id : false
            }
            isBusy={isBlockActionPending}
            className="hidden xl:flex"
            onStartEdit={(block) =>
              handleStartEdit(block.id, block.text, block.revision)
            }
            onSelectBlock={handleSelectBlock}
            onVoiceChange={handleUpdateBlockVoice}
            onGenerate={handleGenerateBlockAudio}
          />
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
