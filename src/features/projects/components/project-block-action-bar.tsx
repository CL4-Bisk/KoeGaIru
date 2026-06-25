"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { Lock, Music2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { VOICE_CATEGORY_LABELS } from "@/features/voices/data/voice-categories";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";

import { getProjectBlockActionState } from "../lib/block-actions";

type Project = inferRouterOutputs<AppRouter>["projects"]["getById"];
type ProjectBlock = Project["blocks"][number];
type Voices = inferRouterOutputs<AppRouter>["voices"]["getAll"];
type Voice = Voices["custom"][number];

function findVoice(voices: Voice[], voiceId: string | null) {
  if (!voiceId) {
    return null;
  }

  return voices.find((voice) => voice.id === voiceId) ?? null;
}

export function ProjectBlockActionBar({
  selectedBlock,
  voices,
  isEditingSelectedBlock,
  isBusy,
  className,
  onStartEdit,
  onVoiceChange,
  onGenerate,
}: {
  selectedBlock: ProjectBlock | null;
  voices: Voices;
  isEditingSelectedBlock: boolean;
  isBusy: boolean;
  className?: string;
  onStartEdit: (block: ProjectBlock) => void;
  onVoiceChange: (blockId: string, voiceId: string) => void;
  onGenerate: (blockId: string) => void;
}) {
  const allVoices = [...voices.custom, ...voices.system];
  const selectedVoice =
    selectedBlock?.voice ?? findVoice(allVoices, selectedBlock?.voiceId ?? null);
  const actionState = getProjectBlockActionState({
    hasSelectedBlock: Boolean(selectedBlock),
    hasVoice: Boolean(selectedBlock?.voiceId),
    isBusy,
    isEditingSelectedBlock,
    isGenerating: Boolean(isBusy && selectedBlock?.status === "GENERATING"),
  });

  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-6 -mb-6 shrink-0 border-t bg-background/95 p-4 backdrop-blur lg:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={selectedBlock?.voiceId ?? ""}
            onValueChange={(voiceId) => {
              if (selectedBlock) {
                onVoiceChange(selectedBlock.id, voiceId);
              }
            }}
            disabled={!actionState.canChangeVoice}
          >
            <SelectTrigger
              size="sm"
              className="h-8 min-w-0 flex-1 justify-start gap-2 px-2"
            >
              {selectedVoice ? (
                <VoiceAvatar
                  seed={selectedVoice.id}
                  name={selectedVoice.name}
                  className="size-6"
                />
              ) : (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Music2 className="size-3.5 text-muted-foreground" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                {selectedVoice?.name ?? actionState.voiceLabel}
              </span>
            </SelectTrigger>
            <SelectContent>
              {voices.custom.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Team Voices</SelectLabel>
                  {voices.custom.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <VoiceAvatar seed={voice.id} name={voice.name} />
                      <span className="truncate text-sm font-medium">
                        {voice.name} - {VOICE_CATEGORY_LABELS[voice.category]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {voices.custom.length > 0 && voices.system.length > 0 && (
                <SelectSeparator />
              )}
              {voices.system.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Built-in Voices</SelectLabel>
                  {voices.system.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <VoiceAvatar seed={voice.id} name={voice.name} />
                      <span className="truncate text-sm font-medium">
                        {voice.name} - {VOICE_CATEGORY_LABELS[voice.category]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!actionState.canStartEdit}
            onClick={() => {
              if (selectedBlock) {
                onStartEdit(selectedBlock);
              }
            }}
          >
            <Lock className="size-4" />
            <span className="sr-only">Lock selected block</span>
          </Button>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={!actionState.canGenerate}
          onClick={() => {
            if (selectedBlock) {
              onGenerate(selectedBlock.id);
            }
          }}
        >
          {actionState.generateLabel === "Generating..." && (
            <Spinner className="size-3" />
          )}
          {actionState.generateLabel}
        </Button>
      </div>
    </div>
  );
}
