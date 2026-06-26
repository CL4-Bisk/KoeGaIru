"use client";

import { type FormEvent, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import {
  AtSign,
  AudioLines,
  CheckCircle2,
  Clock,
  Download,
  History,
  Lock,
  MessageCircle,
  Music2,
  RotateCcw,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { getProjectBlockAudioStateLabel } from "@/features/projects/lib/project-audio-state";
import type { ProjectCommentMentionSuggestion } from "@/features/projects/lib/project-comments";
import {
  formatProjectExportDuration,
  getFailedProjectExportCount,
  getProjectExportVersionLabel,
} from "@/features/projects/lib/project-export-history";
import { VOICE_CATEGORY_LABELS } from "@/features/voices/data/voice-categories";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";
import { ProjectAudioPreview } from "./project-audio-preview";

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
  className,
  onStartEdit,
  onSelectBlock,
  onVoiceChange,
  onGenerate,
  onRestoreGeneration,
  canExportProjectAudio,
  isExportingProjectAudio,
  isClearingFailedExports,
  isCommentActionPending,
  mentionSuggestions,
  onExportProjectAudio,
  onClearFailedExports,
  onCreateComment,
  onSetCommentResolved,
}: {
  project: Project;
  selectedBlock: ProjectBlock | null;
  voices: Voices;
  isEditingSelectedBlock: boolean;
  isBusy: boolean;
  className?: string;
  onStartEdit: (block: ProjectBlock) => void;
  onSelectBlock: (blockId: string) => void;
  onVoiceChange: (blockId: string, voiceId: string) => void;
  onGenerate: (blockId: string) => void;
  onRestoreGeneration: (blockId: string, historyId: string) => void;
  canExportProjectAudio: boolean;
  isExportingProjectAudio: boolean;
  isClearingFailedExports: boolean;
  isCommentActionPending: boolean;
  mentionSuggestions: ProjectCommentMentionSuggestion[];
  onExportProjectAudio: () => void;
  onClearFailedExports: () => void;
  onCreateComment: (blockId: string, body: string) => void;
  onSetCommentResolved: (commentId: string, isResolved: boolean) => void;
}) {
  const [commentBody, setCommentBody] = useState("");
  const allVoices = [...voices.custom, ...voices.system];
  const selectedVoice =
    selectedBlock?.voice ?? findVoice(allVoices, selectedBlock?.voiceId ?? null);
  const canGenerate =
    Boolean(selectedBlock?.voiceId) && isEditingSelectedBlock && !isBusy;
  const latestExport = project.exports[0] ?? null;
  const latestExportIsOutdated =
    latestExport?.status === "READY" && !latestExport.isLatest;
  const failedExportCount = getFailedProjectExportCount(project.exports);
  const selectedComments = selectedBlock?.comments ?? [];
  const unresolvedCommentCount = selectedComments.filter(
    (comment) => !comment.isResolved,
  ).length;

  const handleCreateComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedBlock || !commentBody.trim()) {
      return;
    }

    onCreateComment(selectedBlock.id, commentBody);
    setCommentBody("");
  };

  const handleAddMention = (username: string) => {
    setCommentBody((currentBody) => {
      const body = currentBody.trimEnd();
      const prefix = body ? `${body} ` : "";

      return `${prefix}@${username} `;
    });
  };

  return (
    <aside
      className={cn(
        "flex min-h-[32rem] flex-col rounded-lg border bg-background lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]",
        className,
      )}
    >
      <Tabs
        defaultValue="settings"
        className="flex min-h-0 flex-1 flex-col gap-y-0"
      >
        <TabsList className="h-12 w-full rounded-none border-b bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-12">
          <TabsTrigger value="settings" className={tabTriggerClassName}>
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="comments" className={tabTriggerClassName}>
            <MessageCircle className="size-4" />
            Comments
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
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline">{selectedBlock.status}</Badge>
                  {selectedBlock.audioState !== "NO_AUDIO" && (
                    <Badge
                      variant={
                        selectedBlock.audioState === "STALE"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {getProjectBlockAudioStateLabel(selectedBlock.audioState)}
                    </Badge>
                  )}
                </div>
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

                {selectedBlock.generation &&
                selectedBlock.audioState === "CURRENT" ? (
                  <ProjectAudioPreview
                    audioUrl={selectedBlock.generation.audioUrl}
                    text={selectedBlock.generation.text}
                    voice={{
                      id: selectedBlock.generation.voiceId,
                      name: selectedBlock.generation.voiceName,
                    }}
                    compact
                    className="border-muted bg-muted/20"
                  />
                ) : selectedBlock.audioState === "STALE" ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-muted-foreground">
                    This block changed after its last generation. The old audio
                    is saved in history, but export needs a regenerated clip.
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
          value="comments"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          {!selectedBlock ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="rounded-full bg-muted p-3">
                <MessageCircle className="size-5 text-muted-foreground" />
              </div>
              <p className="font-semibold tracking-tight">Select a block</p>
              <p className="max-w-56 text-sm text-muted-foreground">
                Comments are attached to the selected script block.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Block comments</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {selectedBlock.text}
                  </p>
                </div>
                <Badge variant={unresolvedCommentCount > 0 ? "secondary" : "outline"}>
                  {unresolvedCommentCount} open
                </Badge>
              </div>

              <form onSubmit={handleCreateComment} className="flex flex-col gap-3">
                <Textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-24"
                />
                {mentionSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mentionSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isCommentActionPending}
                        onClick={() => handleAddMention(suggestion.username)}
                      >
                        <AtSign className="size-4" />
                        {suggestion.username}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCommentActionPending || !commentBody.trim()}
                  >
                    <MessageCircle className="size-4" />
                    Comment
                  </Button>
                </div>
              </form>

              {selectedComments.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  No comments yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedComments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {comment.authorName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant={comment.isResolved ? "outline" : "secondary"}
                          >
                            {comment.isResolved ? "Resolved" : "Open"}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isCommentActionPending}
                            onClick={() =>
                              onSetCommentResolved(
                                comment.id,
                                !comment.isResolved,
                              )
                            }
                          >
                            <CheckCircle2 className="size-4" />
                            {comment.isResolved ? "Reopen" : "Resolve"}
                          </Button>
                        </div>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {comment.body}
                      </p>

                      {comment.mentionedUsernames.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {comment.mentionedUsernames.map((username) => (
                            <Badge key={username} variant="outline">
                              @{username}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="history"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <div className="flex flex-col gap-4 p-2">
            <div className="flex flex-col gap-1">
              <div className="px-2 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Project exports</p>
                    <p className="text-xs text-muted-foreground">
                      {project.exports.length} export
                      {project.exports.length === 1 ? "" : "s"} saved for this
                      project.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    {failedExportCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isClearingFailedExports}
                        onClick={onClearFailedExports}
                      >
                        <Trash2 className="size-4" />
                        {isClearingFailedExports
                          ? "Clearing..."
                          : `Clear failed (${failedExportCount})`}
                      </Button>
                    )}
                    {latestExportIsOutdated && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          !canExportProjectAudio || isExportingProjectAudio
                        }
                        onClick={onExportProjectAudio}
                      >
                        <Download className="size-4" />
                        {isExportingProjectAudio
                          ? "Exporting..."
                          : "Export again"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {project.exports.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  No exports yet.
                </div>
              ) : (
                project.exports.map((projectExport) => (
                  <div
                    key={projectExport.id}
                    className="rounded-lg border bg-background p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {projectExport.fileName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(projectExport.createdAt).toLocaleString()}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {formatProjectExportDuration(
                              projectExport.durationMs,
                            )}
                          </span>
                          <span>&middot;</span>
                          <span>{projectExport.contentType}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="outline">{projectExport.status}</Badge>
                        <Badge
                          variant={
                            projectExport.status === "READY" &&
                            projectExport.isLatest
                              ? "secondary"
                              : projectExport.status === "FAILED"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {getProjectExportVersionLabel({
                            status: projectExport.status,
                            isLatest: projectExport.isLatest,
                          })}
                        </Badge>
                      </div>
                    </div>

                    {projectExport.errorMessage && (
                      <p className="mt-2 line-clamp-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                        {projectExport.errorMessage}
                      </p>
                    )}

                    {projectExport.audioUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        asChild
                      >
                        <a href={projectExport.audioUrl}>
                          <Download className="size-4" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedBlock && (
              <div className="flex flex-col gap-1">
                <div className="px-2 py-2">
                  <p className="text-sm font-semibold">Selected block audio</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBlock.generationHistory.length} generated version
                    {selectedBlock.generationHistory.length === 1 ? "" : "s"}.
                  </p>
                </div>

                {selectedBlock.generationHistory.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                    No generated audio history yet.
                  </div>
                ) : (
                  selectedBlock.generationHistory.map((history) => (
                    <div key={history.id} className="rounded-lg border p-2">
                      <div className="mb-2 flex items-center justify-between gap-2 px-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(history.createdAt).toLocaleString()}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant={
                              history.isCurrent &&
                              selectedBlock.audioState === "STALE"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {history.isCurrent
                              ? getProjectBlockAudioStateLabel(
                                  selectedBlock.audioState,
                                )
                              : "Previous"}
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              !isEditingSelectedBlock ||
                              isBusy ||
                              (history.isCurrent &&
                                selectedBlock.audioState === "CURRENT")
                            }
                            onClick={() =>
                              onRestoreGeneration(selectedBlock.id, history.id)
                            }
                          >
                            <RotateCcw className="size-4" />
                            Restore
                          </Button>
                        </div>
                      </div>
                      <ProjectAudioPreview
                        audioUrl={history.generation.audioUrl}
                        text={history.generation.text}
                        voice={{
                          id: history.generation.voiceId,
                          name: history.generation.voiceName,
                        }}
                        compact
                        className="bg-muted/20"
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
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
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
