export type ProjectBlockAudioState = "NO_AUDIO" | "CURRENT" | "STALE";

type ProjectBlockAudioStateBlock = {
  text: string;
  voiceId: string | null;
  generation: {
    text: string;
    voiceId: string | null;
  } | null;
};

export function getProjectBlockAudioState(
  block: ProjectBlockAudioStateBlock,
): ProjectBlockAudioState {
  if (!block.generation) {
    return "NO_AUDIO";
  }

  if (
    block.text === block.generation.text &&
    block.voiceId === block.generation.voiceId
  ) {
    return "CURRENT";
  }

  return "STALE";
}

export function getProjectBlockAudioStateLabel(
  state: ProjectBlockAudioState,
) {
  switch (state) {
    case "CURRENT":
      return "Current";
    case "STALE":
      return "Needs regeneration";
    case "NO_AUDIO":
      return "No audio";
  }
}

export function getRestoreProjectBlockGenerationData(generation: {
  id: string;
  text: string;
  voiceId: string | null;
}) {
  return {
    text: generation.text,
    voiceId: generation.voiceId,
    generationId: generation.id,
    status: "GENERATED" as const,
  };
}
