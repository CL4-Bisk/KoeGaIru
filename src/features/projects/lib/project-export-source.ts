import { createHash } from "node:crypto";

type ProjectExportSourceBlock = {
  id: string;
  order: number;
  timelineStartMs: number;
  timelineDurationMs: number | null;
  text: string;
  voiceId: string | null;
  generationId: string | null;
  generation: {
    id: string;
    text: string;
    voiceId: string | null;
    r2ObjectKey: string | null;
  } | null;
};

export function getProjectExportSourceHash(
  blocks: ProjectExportSourceBlock[],
) {
  const source = blocks
    .map((block) => ({
      id: block.id,
      order: block.order,
      timelineStartMs: block.timelineStartMs,
      timelineDurationMs: block.timelineDurationMs,
      text: block.text,
      voiceId: block.voiceId,
      generationId: block.generationId,
      generation: block.generation
        ? {
            id: block.generation.id,
            text: block.generation.text,
            voiceId: block.generation.voiceId,
            r2ObjectKey: block.generation.r2ObjectKey,
          }
        : null,
    }))
    .sort(
      (firstBlock, secondBlock) =>
        firstBlock.order - secondBlock.order ||
        firstBlock.id.localeCompare(secondBlock.id),
    );

  return createHash("sha256")
    .update(JSON.stringify(source))
    .digest("hex");
}

export function isProjectExportLatest(
  exportSourceHash: string | null,
  currentSourceHash: string,
) {
  return exportSourceHash === currentSourceHash;
}
