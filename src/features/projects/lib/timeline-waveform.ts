export function getTimelineWaveformAudioUrl(
  generation: { audioUrl: string } | null,
) {
  return generation?.audioUrl ?? null;
}
