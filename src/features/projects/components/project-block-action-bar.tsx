"use client";

import type { ReactNode } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown, History, Lock, MessageCircle, Music2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import type { ProjectCommentMentionSuggestion } from "@/features/projects/lib/project-comments";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";

import {
  ProjectBlockSettingsPanel,
  type ProjectBlockSettingsTab,
} from "./project-block-settings-panel";
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
  const voiceButtonLabel = selectedVoice?.name ?? actionState.voiceLabel;

  const renderPanelDrawer = ({
    title,
    tab,
    trigger,
  }: {
    title: string;
    tab: ProjectBlockSettingsTab;
    trigger: ReactNode;
  }) => (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto">
          <ProjectBlockSettingsPanel
            project={project}
            selectedBlock={selectedBlock}
            voices={voices}
            isEditingSelectedBlock={isEditingSelectedBlock}
            isBusy={isBusy}
            defaultTab={tab}
            className="min-h-0 max-h-[70vh] rounded-none border-0 lg:static lg:top-auto lg:max-h-none"
            onStartEdit={onStartEdit}
            onSelectBlock={onSelectBlock}
            onVoiceChange={onVoiceChange}
            onGenerate={onGenerate}
            onRestoreGeneration={onRestoreGeneration}
            canExportProjectAudio={canExportProjectAudio}
            isExportingProjectAudio={isExportingProjectAudio}
            isClearingFailedExports={isClearingFailedExports}
            isCommentActionPending={isCommentActionPending}
            mentionSuggestions={mentionSuggestions}
            onExportProjectAudio={onExportProjectAudio}
            onClearFailedExports={onClearFailedExports}
            onCreateComment={onCreateComment}
            onSetCommentResolved={onSetCommentResolved}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );

  return (
    <div
      className={cn(
        "shrink-0 p-4 lg:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {renderPanelDrawer({
            title: "Settings",
            tab: "settings",
            trigger: (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-0 flex-1 justify-start gap-2 px-2"
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
                  {voiceButtonLabel}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </Button>
            ),
          })}

          {renderPanelDrawer({
            title: "Comments",
            tab: "comments",
            trigger: (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!selectedBlock}
              >
                <MessageCircle className="size-4" />
                <span className="sr-only">Open comments</span>
              </Button>
            ),
          })}

          {renderPanelDrawer({
            title: "History",
            tab: "history",
            trigger: (
              <Button type="button" variant="outline" size="icon-sm">
                <History className="size-4" />
                <span className="sr-only">Open history</span>
              </Button>
            ),
          })}

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
