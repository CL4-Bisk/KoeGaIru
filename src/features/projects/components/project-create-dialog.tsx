"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProjectCreateForm } from "./project-create-form";

interface ProjectCreateDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectCreateDialog({
  children,
  open,
  onOpenChange,
}: ProjectCreateDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create voice project</DrawerTitle>
            <DrawerDescription>
              Start a shared project for scripts, voices, and generated clips.
            </DrawerDescription>
          </DrawerHeader>
          <ProjectCreateForm
            scrollable
            onSuccess={() => onOpenChange?.(false)}
            footer={(submit) => (
              <DrawerFooter>
                {submit}
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            )}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader className="text-left">
          <DialogTitle>Create voice project</DialogTitle>
          <DialogDescription>
            Start a shared project for scripts, voices, and generated clips.
          </DialogDescription>
        </DialogHeader>
        <ProjectCreateForm onSuccess={() => onOpenChange?.(false)} />
      </DialogContent>
    </Dialog>
  );
}