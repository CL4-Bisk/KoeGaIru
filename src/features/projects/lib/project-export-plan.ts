type ProjectExportPlanBlock = {
  id: string;
  order: number;
  timelineStartMs: number;
  timelineDurationMs: number | null;
  generation: {
    r2ObjectKey: string | null;
  } | null;
};

export type ExportableTimelineBlock = {
  id: string;
  order: number;
  timelineStartMs: number;
  timelineDurationMs: number | null;
  r2ObjectKey: string;
};

function formatSeconds(milliseconds: number) {
  const seconds = milliseconds / 1000;

  return Number.isInteger(seconds)
    ? seconds.toString()
    : seconds.toFixed(3).replace(/0+$/g, "").replace(/\.$/g, "");
}

export function getExportableTimelineBlocks(
  blocks: ProjectExportPlanBlock[],
): ExportableTimelineBlock[] {
  return blocks
    .flatMap((block) =>
      block.generation?.r2ObjectKey
        ? [
            {
              id: block.id,
              order: block.order,
              timelineStartMs: block.timelineStartMs,
              timelineDurationMs: block.timelineDurationMs,
              r2ObjectKey: block.generation.r2ObjectKey,
            },
          ]
        : [],
    )
    .sort(
      (firstBlock, secondBlock) =>
        firstBlock.timelineStartMs - secondBlock.timelineStartMs ||
        firstBlock.order - secondBlock.order,
    );
}

export function getProjectExportDurationMs(
  blocks: ExportableTimelineBlock[],
): number | null {
  const blockEnds = blocks.flatMap((block) =>
    block.timelineDurationMs
      ? [block.timelineStartMs + block.timelineDurationMs]
      : [],
  );

  if (blockEnds.length === 0) {
    return null;
  }

  return Math.max(...blockEnds);
}

export function buildProjectExportMixFilter(blocks: ExportableTimelineBlock[]) {
  const delayedInputs = blocks.map((block, index) => {
    const trimFilter = block.timelineDurationMs
      ? `atrim=0:${formatSeconds(block.timelineDurationMs)},`
      : "";

    return `[${index}:a]${trimFilter}asetpts=PTS-STARTPTS,adelay=${block.timelineStartMs}:all=1[a${index}]`;
  });
  const mixedInputs = blocks.map((_, index) => `[a${index}]`).join("");
  const outputLabel = "[out]";

  return {
    filter: [
      ...delayedInputs,
      `${mixedInputs}amix=inputs=${blocks.length}:duration=longest:dropout_transition=0,alimiter=limit=0.95${outputLabel}`,
    ].join(";"),
    outputLabel,
  };
}
