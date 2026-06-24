"use client";

import type { inferRouterOutputs } from "@trpc/server";
import {
  AudioLines,
  Clock,
  History,
  Lock,
  Music2,
  Settings,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { VOICE_CATEGORY_LABELS } from "@/features/voices/data/voice-categories";
import type { AppRouter } from "@/trpc/routers/_app";

type Project = inferRouterOutputs<AppRouter>["projects"]["getById"];
type ProjectBlock = Project["blocks"][number];
type Voices = inferRouterOutputs<AppRouter>["voices"]["getAll"];
type Voice = Voices["custom"][number];

const tabTriggerClassName =
  "flex-1 h-full gap-2 bg-transparent rounded-none border-x-0 border-t-0 border-b-px border-b-transparent shadow-none data-[state=active]:border-b-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none";

function formatBlockTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function findVoice(voices: Voice[], voiceId: string | null) {
  if (!voiceId) {
    return null;
  }

  return voices.find((voice) => voice.id === voiceId) ?? null;
}

export function ProjectBlockSettingsPanel({
  project,
  selectedBlock,
  voices,
  isEditingSelectedBlock,
  isBusy,
  onStartEdit,
  onSelectBlock,
  onVoiceChange,
  onGenerate,
}: {
  project: Project;
  selectedBlock: ProjectBlock | null;
  voices: Voices;
  isEditingSelectedBlock: boolean;
  isBusy: boolean;
  onStartEdit: (block: ProjectBlock) => void;
  onSelectBlock: (blockId: string) => void;
  onVoiceChange: (blockId: string, voiceId: string) => void;
  onGenerate: (blockId: string) => void;
}) {
  const allVoices = [...voices.custom, ...voices.system];
  const selectedVoice =
    selectedBlock?.voice ?? findVoice(allVoices, selectedBlock?.voiceId ?? null);
  const canGenerate =
    Boolean(selectedBlock?.voiceId) && isEditingSelectedBlock && !isBusy;

  return (
    <aside className="flex min-h-[32rem] flex-col rounded-lg border bg-background lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <Tabs
        defaultValue="settings"
        className="flex min-h-0 flex-1 flex-col gap-y-0"
      >
        <TabsList className="h-12 w-full rounded-none border-b bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-12">
          <TabsTrigger value="settings" className={tabTriggerClassName}>
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClassName}>
            <History className="size-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="settings"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          {!selectedBlock ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="rounded-full bg-muted p-3">
                <Music2 className="size-5 text-muted-foreground" />
              </div>
              <p className="font-semibold tracking-tight">Select a block</p>
              <p className="max-w-56 text-sm text-muted-foreground">
                Pick a script block to manage its voice, output, and generation
                state.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Selected block</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {selectedBlock.text}
                  </p>
                </div>
                <Badge variant="outline">{selectedBlock.status}</Badge>
              </div>

              {!isEditingSelectedBlock && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex gap-2">
                    <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Block is read-only</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Lock this block before changing voice settings or
                        generating audio.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={isBusy}
                    onClick={() => onStartEdit(selectedBlock)}
                  >
                    <Lock className="size-4" />
                    Lock block
                  </Button>
                </div>
              )}

              <Field>
                <FieldLabel>Voice</FieldLabel>
                <Select
                  value={selectedBlock.voiceId ?? ""}
                  onValueChange={(voiceId) =>
                    onVoiceChange(selectedBlock.id, voiceId)
                  }
                  disabled={!isEditingSelectedBlock || isBusy}
                >
                  <SelectTrigger className="h-auto w-full rounded-lg bg-card px-2 py-2">
                    <SelectValue placeholder="Select voice">
                      {selectedVoice && (
                        <>
                          <VoiceAvatar
                            seed={selectedVoice.id}
                            name={selectedVoice.name}
                          />
                          <span className="truncate text-sm font-medium">
                            {selectedVoice.name}
                          </span>
                        </>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {voices.custom.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Team Voices</SelectLabel>
                        {voices.custom.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            <VoiceAvatar seed={voice.id} name={voice.name} />
                            <span className="truncate text-sm font-medium">
                              {voice.name} -{" "}
                              {VOICE_CATEGORY_LABELS[voice.category]}
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
                              {voice.name} -{" "}
                              {VOICE_CATEGORY_LABELS[voice.category]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Voice changes are saved to the selected block and used for
                  the next generation.
                </FieldDescription>
              </Field>

              <div className="rounded-md border p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Audio output</p>
                    <p className="text-xs text-muted-foreground">
                      Generation is explicit to avoid accidental cost spikes.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canGenerate}
                    onClick={() => onGenerate(selectedBlock.id)}
                  >
                    <Sparkles className="size-4" />
                    {isBusy && selectedBlock.status === "GENERATING"
                      ? "Generating..."
                      : "Generate"}
                  </Button>
                </div>

                {selectedBlock.generation ? (
                  <div className="flex flex-col gap-3">
                    <audio
                      controls
                      preload="metadata"
                      src={selectedBlock.generation.audioUrl}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <VoiceAvatar
                        seed={
                          selectedBlock.generation.voiceId ??
                          selectedBlock.generation.voiceName
                        }
                        name={selectedBlock.generation.voiceName}
                      />
                      <span className="truncate">
                        {selectedBlock.generation.voiceName}
                      </span>
                      <span>&middot;</span>
                      <span>
                        {formatDistanceToNow(
                          new Date(selectedBlock.generation.createdAt),
                          { addSuffix: true },
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                    No generated audio yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="history"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <div className="flex flex-col gap-1 p-2">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold">Project blocks</p>
              <p className="text-xs text-muted-foreground">
                {project.blocks.length} block
                {project.blocks.length === 1 ? "" : "s"} in this project.
              </p>
            </div>

            {project.blocks.map((block, index) => (
              <button
                key={block.id}
                type="button"
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted ${
                  selectedBlock?.id === block.id ? "bg-primary/5" : ""
                }`}
                onClick={() => onSelectBlock(block.id)}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{block.text}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {block.generation ? (
                      <AudioLines className="size-3.5" />
                    ) : (
                      <Clock className="size-3.5" />
                    )}
                    <span>{block.status}</span>
                    <span>&middot;</span>
                    <span>rev {block.revision}</span>
                    <span>&middot;</span>
                    <span>{formatBlockTime(block.timelineStartMs)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
