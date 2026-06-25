export function getProjectBlockActionState({
  hasSelectedBlock,
  hasVoice,
  isBusy,
  isEditingSelectedBlock,
  isGenerating,
}: {
  hasSelectedBlock: boolean;
  hasVoice: boolean;
  isBusy: boolean;
  isEditingSelectedBlock: boolean;
  isGenerating: boolean;
}) {
  return {
    canChangeVoice: hasSelectedBlock && isEditingSelectedBlock && !isBusy,
    canGenerate:
      hasSelectedBlock && hasVoice && isEditingSelectedBlock && !isBusy,
    canStartEdit: hasSelectedBlock && !isEditingSelectedBlock && !isBusy,
    generateLabel: isGenerating ? "Generating..." : "Generate speech",
    voiceLabel: !hasSelectedBlock
      ? "Select a block"
      : isEditingSelectedBlock
        ? "Select voice"
        : "Block locked",
  };
}
