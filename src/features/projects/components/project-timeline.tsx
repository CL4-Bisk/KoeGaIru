"use client";

import type { DragEvent } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { AudioLines, Clock, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppRouter } from "@/trpc/routers/_app";
import {
  calculateTimelineStartMs,
  formatTimelineTime,
  getTimelineLeftPercent,
  TIMELINE_DURATION_MS,
} from "../lib/timeline-position";

type Project = inferRouterOutputs<AppRouter>["projects"]["getById"];
type ProjectBlock = Project["blocks"][number];

const TIMELINE_BLOCK_DRAG_TYPE = "application/x-koegairu-timeline-block";
const timelineMarks = [0, 30000, 60000, 90000, 120000];

export function ProjectTimeline({
  blocks,
  selectedBlockId,
  draggingTimelineBlockId,
  isBusy,
  onSelectBlock,
  onDragStart,
  onDragEnd,
  onMoveBlock,
}: {
  blocks: ProjectBlock[];
  selectedBlockId: string | null;
  draggingTimelineBlockId: string | null;
  isBusy: boolean;
  onSelectBlock: (blockId: string) => void;
  onDragStart: (blockId: string) => void;
  onDragEnd: () => void;
  onMoveBlock: (blockId: string, timelineStartMs: number) => void;
}) {
  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    blockId: string,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TIMELINE_BLOCK_DRAG_TYPE, blockId);
    onDragStart(blockId);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    fallbackBlockId: string,
  ) => {
    event.preventDefault();

    const blockId =
      event.dataTransfer.getData(TIMELINE_BLOCK_DRAG_TYPE) ||
      draggingTimelineBlockId;

    if (!blockId) {
      onDragEnd();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const timelineStartMs = calculateTimelineStartMs({
      clientX: event.clientX,
      trackLeft: rect.left,
      trackWidth: rect.width,
      timelineDurationMs: TIMELINE_DURATION_MS,
    });

    onMoveBlock(blockId || fallbackBlockId, timelineStartMs);
  };

  return (
    <section className="rounded-lg border bg-background">
      <div className="flex flex-col gap-1 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Timeline</h2>
          <p className="text-xs text-muted-foreground">
            Drag a clip horizontally to set its start time.
          </p>
        </div>
        <Badge variant="outline">2 min window</Badge>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-2 pb-2">
            <div />
            <div className="relative h-5">
              {timelineMarks.map((mark) => (
                <div
                  key={mark}
                  className="absolute top-0 -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground"
                  style={{
                    left: `${getTimelineLeftPercent(mark)}%`,
                  }}
                >
                  {formatTimelineTime(mark)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {blocks.map((block, index) => {
              const left = getTimelineLeftPercent(block.timelineStartMs);
              const isSelected = selectedBlockId === block.id;
              const isDragging = draggingTimelineBlockId === block.id;

              return (
                <div
                  key={block.id}
                  className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3"
                >
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                    onClick={() => onSelectBlock(block.id)}
                  >
                    {block.generation ? (
                      <AudioLines className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Clock className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">Block {index + 1}</span>
                  </button>

                  <div
                    className={`relative h-12 rounded-md border bg-muted/30 ${
                      isSelected ? "border-primary/60" : ""
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => handleDrop(event, block.id)}
                  >
                    {timelineMarks.map((mark) => (
                      <div
                        key={mark}
                        className="absolute inset-y-0 w-px bg-border"
                        style={{
                          left: `${getTimelineLeftPercent(mark)}%`,
                        }}
                      />
                    ))}

                    <Button
                      type="button"
                      variant={isSelected ? "default" : "secondary"}
                      size="sm"
                      draggable={!isBusy}
                      disabled={isBusy}
                      className={`absolute top-1/2 h-8 max-w-44 -translate-y-1/2 cursor-grab justify-start active:cursor-grabbing ${
                        isDragging ? "opacity-50" : ""
                      }`}
                      style={{
                        left: `${left}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onClick={() => onSelectBlock(block.id)}
                      onDragStart={(event) => handleDragStart(event, block.id)}
                      onDragEnd={onDragEnd}
                    >
                      <GripVertical className="size-3.5" />
                      <span className="truncate">
                        {formatTimelineTime(block.timelineStartMs)}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
